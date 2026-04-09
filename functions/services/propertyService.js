const { db } = require("../config/db");
const AppError = require("../utils/AppError");
const { FieldValue } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

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

        const bucket = admin.storage().bucket();

        const mediaUrls = [];

        for (const file of files) {
            const fileName = `${listingId}/${mediaType}/${Date.now()}-${file.originalname}`;
            const fileUpload = bucket.file(fileName);

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

        return mediaUrls;
    },
}
module.exports = propertyService