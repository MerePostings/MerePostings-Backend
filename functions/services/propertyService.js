const { db, storage } = require("../config/db");
const AppError = require("../utils/AppError");
const { FieldValue } = require('firebase-admin/firestore');
const { Readable } = require('stream');
const fs = require('fs');
const Antropic = require('@anthropic-ai/sdk')
const path = require('path');
const { projectStateToProperty } = require('../utils/projectListingState');

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
     *
     * NOTE: only used by the legacy addProperty/saveProperty flow below.
     * The new draft-field flow validates+writes one field at a time, so
     * there's no bulk payload left to sanitize.
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
     * LEGACY — full-payload create/update, kept for backward compatibility
     * while the frontend migrates to initiateProperty() + saveDraftField().
     * Safe to delete once nothing calls POST /add-property anymore.
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
     * STAGE 1 — Initiation.
     * Creates properties/{id} + listingProcesses/{id}. occupancyType optional.
     */
    initiateProperty: async (userId, body = {}) => {
        const { occupancyType } = body || {};
        try {
            const propertyData = {
                ownerId: userId,
                status: 'initiated',
                paid: false,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            if (occupancyType) propertyData.occupancyType = occupancyType;

            const listingRef = await db.collection('properties').add(propertyData);
            const listingId = listingRef.id;

            await db.collection('listingProcesses').doc(listingId).set({
                ownerId: userId,
                listingId,
                furthestMajorIndex: 0,
                state: occupancyType
                    ? {
                        occupancy:
                            occupancyType === 'owner_occupied'
                                ? 'owner'
                                : occupancyType === 'tenant_occupied'
                                    ? 'tenant'
                                    : 'vacant',
                    }
                    : {},
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            return listingId;
        } catch (e) {
            console.error("Error initiating property:", e);
            throw new AppError("Failed to initiate property", 500);
        }
    },

    getListingProcess: async (userId, listingId) => {
        const propSnap = await db.collection('properties').doc(listingId).get();
        if (!propSnap.exists) throw new AppError('Property not found', 404);
        const prop = propSnap.data();
        if (prop.ownerId !== userId) throw new AppError('Unauthorized access to this property', 403);

        const procSnap = await db.collection('listingProcesses').doc(listingId).get();
        if (!procSnap.exists) {
            // Backfill empty process for older properties
            const empty = {
                ownerId: userId,
                listingId,
                furthestMajorIndex: 0,
                state: {},
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            await db.collection('listingProcesses').doc(listingId).set(empty);
            return {
                listingId,
                furthestMajorIndex: 0,
                state: {},
                propertyStatus: prop.status,
            };
        }

        const data = procSnap.data();
        return {
            listingId,
            furthestMajorIndex: data.furthestMajorIndex ?? 0,
            state: data.state || {},
            propertyStatus: prop.status,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };
    },

    saveListingProcess: async (userId, listingId, { furthestMajorIndex, state }) => {
        const propRef = db.collection('properties').doc(listingId);
        const propSnap = await propRef.get();
        if (!propSnap.exists) throw new AppError('Property not found', 404);
        const prop = propSnap.data();
        if (prop.ownerId !== userId) throw new AppError('Unauthorized access to this property', 403);
        if (prop.status === 'submitted') {
            throw new AppError('Cannot edit a listing that has already been submitted', 409);
        }

        const procRef = db.collection('listingProcesses').doc(listingId);
        const procSnap = await procRef.get();
        const prev = procSnap.exists ? procSnap.data() : {
            ownerId: userId,
            listingId,
            furthestMajorIndex: 0,
            state: {},
        };

        const nextState =
            state != null
                ? { ...(prev.state || {}), ...state }
                : prev.state || {};
        const nextIndex =
            typeof furthestMajorIndex === 'number'
                ? Math.max(prev.furthestMajorIndex ?? 0, furthestMajorIndex)
                : prev.furthestMajorIndex ?? 0;

        await procRef.set(
            {
                ownerId: userId,
                listingId,
                furthestMajorIndex: nextIndex,
                state: nextState,
                updatedAt: FieldValue.serverTimestamp(),
                ...(procSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
            },
            { merge: true }
        );

        const propertyPatch = projectStateToProperty(nextState);
        const hasPatch = Object.keys(propertyPatch).length > 0;
        if (hasPatch || Object.keys(nextState).length > 0) {
            await propRef.update({
                ...propertyPatch,
                status: prop.status === 'initiated' ? 'draft' : prop.status,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        return {
            listingId,
            furthestMajorIndex: nextIndex,
            state: nextState,
            propertyStatus: hasPatch && prop.status === 'initiated' ? 'draft' : prop.status,
        };
    },

    getOwnerMostRecentProcess: async (userId) => {
        try {
            // Avoid composite index: filter by owner, sort in memory
            const snapshot = await db
                .collection('listingProcesses')
                .where('ownerId', '==', userId)
                .get();

            if (snapshot.empty) {
                return { process: null };
            }

            const docs = snapshot.docs
                .map((doc) => {
                    const data = doc.data();
                    const updatedAt = data.updatedAt?.toDate?.() || data.updatedAt || new Date(0);
                    return { id: doc.id, data, updatedAt: new Date(updatedAt).getTime() };
                })
                .sort((a, b) => b.updatedAt - a.updatedAt);

            for (const { id, data } of docs) {
                const propSnap = await db.collection('properties').doc(id).get();
                if (!propSnap.exists) continue;
                const status = propSnap.data().status;
                if (status === 'submitted' || status === 'active' || status === 'closed') continue;
                return {
                    process: {
                        listingId: id,
                        furthestMajorIndex: data.furthestMajorIndex ?? 0,
                        state: data.state || {},
                        propertyStatus: status,
                        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                    },
                };
            }

            return { process: null };
        } catch (e) {
            console.error('Error in getOwnerMostRecentProcess:', e);
            throw new AppError(`Failed to fetch most recent listing process: ${e.message}`, 500);
        }
    },

    /**
     * STAGE 2 — Draft auto-save, one field at a time (legacy / compat).
     * `field` is the object attached by middlewares/validateDraftField.js:
     *   { propertyType, fieldName, fieldValue, path, dbKey }
     */
    saveDraftField: async (userId, listingId, field) => {
        const { propertyType, fieldName, fieldValue, path: sectionPath, dbKey } = field;

        const docRef = db.collection('properties').doc(listingId);
        const snap = await docRef.get();

        if (!snap.exists) {
            throw new AppError("Property not found", 404);
        }

        const existing = snap.data();

        if (existing.ownerId !== userId) {
            throw new AppError("Unauthorized access to this property", 403);
        }

        if (existing.status === 'submitted') {
            throw new AppError("Cannot edit a listing that has already been submitted", 409);
        }

        if (existing.propertyType && existing.propertyType !== propertyType) {
            throw new AppError(
                `Property type mismatch: listing is "${existing.propertyType}" but request sent "${propertyType}"`,
                409
            );
        }

        const firestoreKey = sectionPath === 'top' ? dbKey : `${sectionPath}.${dbKey}`;

        try {
            await docRef.update({
                [firestoreKey]: fieldValue,
                status: 'draft',
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            console.error("Error saving draft field:", e);
            throw new AppError("Failed to save field", 500);
        }

        return { [fieldName]: fieldValue };
    },

    /**
     * STAGE 3 — Submission.
     * Call this from wherever payment success is confirmed 
     */
    markSubmitted: async (listingId) => {
        try {
            await db.collection('properties').doc(listingId).update({
                status: 'submitted',
                paid: true,
                submittedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            console.error("Error marking property submitted:", e);
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

            let amountPaid;

            try{
                const snapshot = await db
                    .collection("transactions")
                    .where("listingId", "==", id)
                    .orderBy("createdAt", "desc")
                    .get();
    
                
                amountPaid = snapshot.docs[0].data().amount || 400;
            }catch(e){
                amountPaid = 0
            }


            return {
                id: docSnap.id,
                ...data,
                amountPaid,
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

    reorderMedia: async (listingId, mediaType, urls) => {
        try{
            if (!['photos', 'attachments'].includes(mediaType)) {
                throw new AppError('Invalid media type', 400);
            }
            
            if (!Array.isArray(urls) || urls.length === 0) {
                throw new AppError('urls must be a non-empty array', 400);
            }
        
            const docRef = db.collection('properties').doc(listingId);
            const snap   = await docRef.get();
        
            if (!snap.exists) throw new AppError('Property not found', 404);
        
            const currentMedia = snap.data()?.media?.[mediaType] ?? [];
        
            const mediaByUrl = new Map(currentMedia.map(item => [item.url, item]));
        
            const reordered = urls
                .filter(url => mediaByUrl.has(url))
                .map(url => mediaByUrl.get(url));
        
            const urlSet = new Set(urls);
            const orphans = currentMedia.filter(item => !urlSet.has(item.url));
            const finalMedia = [...reordered, ...orphans];
        
            await docRef.update({
                [`media.${mediaType}`]: finalMedia,
                updatedAt:              FieldValue.serverTimestamp(),
            });
        
            return finalMedia;
        }catch(e){
            throw new AppError(e.message || "Failed to reorder media", 500);
        }
    },

    getOwnerMostRecentProperty: async (uid) => {
        try {
            const snapshot = await db
                .collection("properties")
                .where("ownerId", "==", uid)
                .orderBy("updatedAt", "desc")
                .get();

            if (snapshot.empty) {
                return {
                    property: null,
                    stats: { active: 0, draft: 0, closed: 0, pending: 0 },
                };
            }

            const properties = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                };
            });

            const stats = properties.reduce(
                (acc, property) => {
                    const status = property.status;
                    if (acc[status] !== undefined) {
                        acc[status] += 1;
                    }
                    return acc;
                },
                { active: 0, draft: 0, closed: 0, pending: 0 }
            );

            return {
                property: properties[0], // most recent, since ordered by updatedAt desc
                stats,
            };
        } catch (e) {
            console.error("Error in getOwnerMostRecentProperty:", e);
            throw new AppError(`Failed to fetch most recent owner property: ${e.message}`, 500);
        }
    },

}
module.exports = propertyService