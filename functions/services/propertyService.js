const { db, storage } = require("../config/db");
const AppError = require("../utils/AppError");
const { FieldValue } = require('firebase-admin/firestore');
const { google } = require('googleapis')
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

const buildAddressName = (location) => {
    try {
        const parts = [
            location.streetNumber,
            location.streetName,
            location.abbreviation,
            location.streetDirection ?? null,
        ].filter(Boolean).join(' ');

        const unit = location.apartmentUnitNumber
            ? `Unit ${location.apartmentUnitNumber}`
            : null;

        const municipality = location.municipality ?? null;
        return [parts, unit, municipality].filter(Boolean).join(', ');
    } catch (e) {
        console.log(e)
    }
}

const propertyService = {

    /**
     * Cleans the payload before saving to Firestore
     * - Removes any key literally named "undefined"
     * - Removes any top-level keys that have undefined values
     * - Cleans inside sectionValues and all section objects
     */
    cleanPayload: (payload) => {
        if (!payload || typeof payload !== 'object') return payload;

        const cleaned = JSON.parse(JSON.stringify(payload));

        const cleanObject = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;

            Object.keys(obj).forEach(key => {
                if (key === 'undefined') {
                    delete obj[key];
                    return;
                }

                if (obj[key] === undefined) {
                    delete obj[key];
                    return;
                }

                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    obj[key] = cleanObject(obj[key]);
                }
            });
            return obj;
        };

        cleanObject(cleaned);

        if (cleaned.sectionValues && typeof cleaned.sectionValues === 'object') {
            cleanObject(cleaned.sectionValues);
        }

        Object.keys(cleaned).forEach(key => {
            if (typeof cleaned[key] === 'object' &&
                key !== 'sectionValues' &&
                key !== 'saleType' &&
                key !== 'selectedType' &&
                key !== 'subType') {
                cleaned[key] = cleanObject(cleaned[key]);
            }
        });

        return cleaned;
    },

    /**
     * Creates a new property listing in Firestore
     * - Cleans the payload before saving
     * - Skips creation if a listingId already exists (idempotent)
     * - Saves core property fields and all sectionValues to the document
     * - Sets initial status as 'draft' and paid as false
     */
    saveProperty: async (userId, payload) => {
        const cleanData = propertyService.cleanPayload(payload);

        const {
            saleType,
            selectedType,
            subType,
            existingListingId,
            sectionValues,
        } = cleanData;

        const dataToSave = {
            ownerId: userId,
            saleType: saleType || null,
            propertyType: selectedType || null,
            subType: subType || null,
            ...sectionValues,
            paid: false,
            status: 'draft',
            updatedAt: FieldValue.serverTimestamp(),
        };

        try {
            if (existingListingId) {
                await db.collection('properties')
                    .doc(existingListingId)
                    .set(dataToSave, { merge: true });

                return existingListingId;
            } else {
                const listingRef = await db.collection('properties').add({
                    ...dataToSave,
                    createdAt: FieldValue.serverTimestamp(),
                });

                const newListingId = listingRef.id;
                return newListingId;
            }
        } catch (e) {
            console.error("Error saving property:", e);
            throw new AppError("Failed to save Property", 500);
        }
    },

    /**
     * Uploads photos or attachments to Firebase Storage for a given listing
     * - Validates mediaType is either 'photos' or 'attachments'
     * - Uploads each file to Storage under listingId/mediaType/
     * - Generates a long-lived signed URL for each file
     * - Appends uploaded file metadata to the listing's media array in Firestore
     */
    uploadMedia: async (listingId, files, mediaType) => {

        if (!['photos', 'attachments'].includes(mediaType)) {
            throw new AppError("Invalid media type", 400);
        }
        if (!files || files.length === 0) {
            throw new AppError("No files received", 400);
        }

        const mediaUrls = [];

        try {

            for (const file of files) {
                const fileName = `${listingId}/${mediaType}/${Date.now()}-${file.originalname}`;

                const fileUpload = storage.file(fileName);

                await fileUpload.save(file.buffer, {
                    metadata: { contentType: file.mimetype },
                });

                const [url] = await fileUpload.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500',
                });

                mediaUrls.push({
                    url,
                    fileName: file.originalname,
                    uploadedAt: new Date(),
                });
            }

            await db.collection('properties').doc(listingId).update({
                [`media.${mediaType}`]: FieldValue.arrayUnion(...mediaUrls),
                updatedAt: FieldValue.serverTimestamp(),
            });


        } catch (firebaseErr) {
            throw new AppError(firebaseErr.message || "Failed to upload to Firebase", 500);
        }

        try {

            if (!process.env.SIGNATURE) {
                return mediaUrls;
            }

            const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
            if (!sharedDriveId) {
                return mediaUrls;
            }

            const keyPath = process.env.SIGNATURE.startsWith('/')
                ? process.env.SIGNATURE
                : path.resolve(process.cwd(), process.env.SIGNATURE);

            const auth = new google.auth.GoogleAuth({
                keyFilename: keyPath,
                scopes: ['https://www.googleapis.com/auth/drive'],
            });

            const drive = google.drive({ version: 'v3', auth });

            await drive.drives.get({
                driveId: sharedDriveId,
                fields: 'id,name',
                useDomainAdminAccess: false,
            });

            const safeQ = (s) => s.replace(/'/g, "\\'");

            const getOrCreateFolder = async (parentId, folderName) => {
                const q = parentId
                    ? `name='${safeQ(folderName)}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
                    : `name='${safeQ(folderName)}' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`;

                const res = await drive.files.list({
                    q,
                    fields: 'files(id,name)',
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                    corpora: 'drive',
                    driveId: sharedDriveId,
                });

                if (res.data.files?.length) return res.data.files[0].id;

                const folderMetadata = {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId || sharedDriveId],
                };

                const folder = await drive.files.create({
                    requestBody: folderMetadata,
                    fields: 'id',
                    supportsAllDrives: true,
                });

                return folder.data.id;
            };

            const propertyRef = db.collection("properties").doc(listingId);
            const propertySnap = await propertyRef.get();

            if (!propertySnap.exists) {
                throw new Error("User document not found");
            }

            const propertyData = propertySnap.data();
            const location = propertyData.Location;

            const addressName = buildAddressName(location)
            const listingFolderId = await getOrCreateFolder(null, addressName);
            const subFolderId = await getOrCreateFolder(listingFolderId, mediaType);
            await Promise.all(
                files.map(async (file, index) => {
                    const uploaded = await drive.files.create({
                        requestBody: {
                            name: `${index + 1}`,
                            parents: [subFolderId],
                        },
                        media: {
                            mimeType: file.mimetype,
                            body: Readable.from(file.buffer),
                        },
                        fields: 'id, webViewLink',
                        supportsAllDrives: true,
                    });

                    return uploaded.data;
                })
            );

        } catch (driveErr) {
            if (driveErr.response) console.error('Status:', driveErr.response.status);
        }

        return mediaUrls;
    },

    removeMedia: async (listingId, mediaType, mediaUrl) => {
        if (!['photos', 'attachments'].includes(mediaType)) {
            throw new AppError("Invalid media type", 400);
        }

        const docRef = db.collection('properties').doc(listingId);
        const snap = await docRef.get();

        if (!snap.exists) throw new AppError("Property not found", 404);

        const data = snap.data();
        const currentMedia = data?.media?.[mediaType] ?? [];
        const updatedMedia = currentMedia.filter(item => item.url !== mediaUrl);

        await docRef.update({
            [`media.${mediaType}`]: updatedMedia,
            updatedAt: FieldValue.serverTimestamp(),
        });

        try {
            const urlObj = new URL(mediaUrl);
            const pathMatch = urlObj.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)/);
            if (pathMatch) {
                const filePath = decodeURIComponent(pathMatch[1]);
                await storage.file(filePath).delete();
            }
        } catch (e) {
            console.error("Storage deletion failed (non-critical):", e.message);
        }
    },

    getListing: async (uid, id) => {
        try {
            const docRef = db.collection("properties").doc(id);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                throw new AppError("Property not found", 404);
            }

            const data = docSnap.data();

            if (data.ownerId !== uid) {
                throw new AppError("Unauthorized access to this property", 403);
            }

            return {
                id: docSnap.id,
                ...data,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            };

        } catch (e) {
            console.error("Error in getListing:", e);
            throw new AppError(`Failed to fetch listing: ${e.message}`, 500);
        }
    },

    getOwnerProperties: async (uid) => {
        try {
            const snapshot = await db
                .collection("properties")
                .where("ownerId", "==", uid)
                .orderBy("updatedAt", "desc")
                .get();

            const properties = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
            }));

            return properties;
        } catch (e) {
            console.error("Error in getOwnerProperty:", e);
            throw new AppError(`Failed to fetch owner properties: ${e.message}`, 500);
        }
    },

}
module.exports = propertyService