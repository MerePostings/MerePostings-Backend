const path = require('path');
const logger = require("firebase-functions/logger");
const { getStepsForListing } = require("../data/progressTrackerSteps")
const { db, storage } = require("../config/db");
const AppError = require("../utils/AppError");
const { FieldValue } = require('firebase-admin/firestore');
const { ADDONS_BY_ID } = require('../data/addons')
const actionService = require('./actionService')
const EDITABLE_STATUSES = new Set(['initiated', 'draft']);

const MEDIA_LIMITS = {
    photos: {
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
        maxBytes: 15 * 1024 * 1024,
        maxFiles: 50,
    },
    attachments: {
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
        ],
        maxBytes: 20 * 1024 * 1024,
        maxFiles: 15,
    },
};

/** Throws 404/403 unless `uid` owns `listingId`. Skip entirely for admin-initiated calls. */
async function assertListingOwnership(listingId, uid) {
    const snap = await db.collection('properties').doc(listingId).get();
    if (!snap.exists) throw new AppError('Property not found', 404);
    if (snap.data().ownerId !== uid) throw new AppError('Unauthorized access to this property', 403);
}

function occupancyFromBe(occupancyType) {
    if (occupancyType === 'owner_occupied') return 'owner';
    if (occupancyType === 'tenant_occupied') return 'tenant';
    if (occupancyType === 'vacant') return 'vacant';
    return null;
}

/** Flat listing-process fields stored once on the property root (no flowState). */
const PROCESS_FIELD_KEYS = [
    'listedWithOtherBrokerage',
    'supportTier',
    'occupancy',
    'propertyType',
    'askingPrice',
    'selectedAddons',
    'walkthroughAnswers',
    'sellerContact',
    'ownership',
    'mailingAddress',
    'propertyDetails',
    'featuresUpgrades',
    'buyerCopy',
    'sellerConfirmations',
];

/** Intermediate step-group keys to delete after migrating to flat. */
const STEP_GROUP_KEYS = [
    'getStarted',
    'sellingStyle',
    'basicDetail',
    'tellBuyers',
    'beforeLive',
    'reviewListing',
];

function isStepGroupedState(state) {
    if (!state || typeof state !== 'object') return false;
    return STEP_GROUP_KEYS.some((k) => state[k] != null && typeof state[k] === 'object');
}

function isFlatProcessState(state) {
    if (!state || typeof state !== 'object') return false;
    // Flat if any process field is present and we're not in step-group shape
    if (isStepGroupedState(state)) return false;
    return PROCESS_FIELD_KEYS.some((k) => k in state);
}

/** Unwrap step-grouped wire → flat process fields. */
function unwrapStepGroupsToFlat(grouped) {
    if (!grouped || typeof grouped !== 'object') return {};
    const out = {};
    if (typeof grouped.furthestMajorIndex === 'number') {
        out.furthestMajorIndex = grouped.furthestMajorIndex;
    }
    if (grouped.getStarted) {
        out.listedWithOtherBrokerage = grouped.getStarted.listedWithOtherBrokerage ?? null;
    }
    if (grouped.sellingStyle) {
        out.supportTier = grouped.sellingStyle.supportTier ?? null;
        out.walkthroughAnswers = grouped.sellingStyle.walkthroughAnswers ?? {};
    }
    if (grouped.basicDetail) {
        out.occupancy = grouped.basicDetail.occupancy ?? null;
        out.sellerContact = grouped.basicDetail.sellerContact ?? {};
        out.ownership = grouped.basicDetail.ownership ?? {};
        out.mailingAddress = grouped.basicDetail.mailingAddress ?? {};
    }
    if (grouped.propertyDetails && typeof grouped.propertyDetails === 'object') {
        const { propertyType, askingPrice, ...rest } = grouped.propertyDetails;
        out.propertyDetails = rest;
        if (propertyType !== undefined) out.propertyType = propertyType;
        if (askingPrice !== undefined) out.askingPrice = askingPrice;
    }
    if (grouped.featuresUpgrades != null) out.featuresUpgrades = grouped.featuresUpgrades;
    if (grouped.tellBuyers != null) out.buyerCopy = grouped.tellBuyers;
    if (grouped.beforeLive?.selectedAddons != null) {
        out.selectedAddons = grouped.beforeLive.selectedAddons;
    }
    if (grouped.reviewListing != null) out.sellerConfirmations = grouped.reviewListing;
    return out;
}

/** Normalize incoming PATCH state (flat, step-grouped, or legacy flowState blob) → flat. */
function normalizeIncomingState(state) {
    if (!state || typeof state !== 'object') return {};
    if (isStepGroupedState(state)) return unwrapStepGroupsToFlat(state);
    // Already flat (or legacy flat flowState contents)
    const out = {};
    if (typeof state.furthestMajorIndex === 'number') {
        out.furthestMajorIndex = state.furthestMajorIndex;
    }
    for (const k of PROCESS_FIELD_KEYS) {
        if (k in state) out[k] = state[k];
    }
    return out;
}

/** Assemble listing-process `state` from property root (flat preferred). */
function assembleProcessState(prop) {
    if (isFlatProcessState(prop)) {
        const state = {};
        if (typeof prop.furthestMajorIndex === 'number') {
            state.furthestMajorIndex = prop.furthestMajorIndex;
        }
        for (const k of PROCESS_FIELD_KEYS) {
            if (k in prop) state[k] = prop[k];
        }
        // Prefer root selectedAddons; fall back to brief beforeLive window
        if (!Array.isArray(state.selectedAddons) && Array.isArray(prop.beforeLive?.selectedAddons)) {
            state.selectedAddons = prop.beforeLive.selectedAddons;
        }
        return state;
    }
    if (isStepGroupedState(prop)) {
        return unwrapStepGroupsToFlat(prop);
    }
    if (prop.flowState && typeof prop.flowState === 'object') {
        return normalizeIncomingState(prop.flowState);
    }
    return {};
}

/** selectedAddons at root; fall back to beforeLive (step-group window). */
function getSelectedAddons(prop) {
    if (Array.isArray(prop?.selectedAddons)) return prop.selectedAddons;
    if (Array.isArray(prop?.beforeLive?.selectedAddons)) return prop.beforeLive.selectedAddons;
    return [];
}

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep-merge plain objects for listing-process nested fields.
 * Arrays / scalars / null replace. Used so sparse nested PATCHes keep siblings.
 */
function deepMergePlainObjects(prev, next) {
    if (!isPlainObject(next)) return next;
    if (!isPlainObject(prev)) return { ...next };
    const out = { ...prev };
    for (const key of Object.keys(next)) {
        const n = next[key];
        const p = prev[key];
        if (isPlainObject(n) && isPlainObject(p)) {
            out[key] = deepMergePlainObjects(p, n);
        } else {
            out[key] = n;
        }
    }
    return out;
}

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
        logger.error(e)
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
            logger.error("Error saving property:", e);
            throw new AppError("Failed to save Property", 500);
        }
    },

    /**
     * STAGE 1 — Initiation.
     * Creates properties/{id}. Optional occupancy seeds flat occupancy field.
     */
    initiateProperty: async (userId, body = {}) => {
        const { occupancyType } = body || {};
        try {
            const occupancy = occupancyFromBe(occupancyType);
            const propertyData = {
                ownerId: userId,
                status: 'initiated',
                paid: false,
                furthestMajorIndex: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            if (occupancyType) propertyData.occupancyType = occupancyType;

            const listingRef = await db.collection('properties').add(propertyData);
            return listingRef.id;
        } catch (e) {
            logger.error("Error initiating property:", e);
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
            state: assembleProcessState(prop),
            propertyStatus: prop.status,
            updatedAt: prop.updatedAt?.toDate?.() || prop.updatedAt,
        };
    },

    saveListingProcess: async (userId, listingId, { state }) => {
        const propRef = db.collection('properties').doc(listingId);
        const propSnap = await propRef.get();
        if (!propSnap.exists) throw new AppError('Property not found', 404);
        const prop = propSnap.data();
        if (prop.ownerId !== userId) throw new AppError('Unauthorized access to this property', 403);
        if (prop.status === 'submitted') {
            throw new AppError('Cannot edit a listing that has already been submitted', 409);
        }

        const incoming = state != null ? normalizeIncomingState(state) : {};
        const prev = assembleProcessState(prop);

        const nextState = { ...prev };
        if (typeof incoming.furthestMajorIndex === 'number') {
            nextState.furthestMajorIndex = Math.max(0, Math.min(8, incoming.furthestMajorIndex));
        }
        // Sparse PATCH: deep-merge nested objects; arrays/scalars replace.
        for (const k of PROCESS_FIELD_KEYS) {
            if (k in incoming) {
                nextState[k] = deepMergePlainObjects(prev[k], incoming[k]);
            }
        }

        const nextStatus = prop.status === 'initiated' ? 'draft' : prop.status;
        const update = {
            status: nextStatus,
            updatedAt: FieldValue.serverTimestamp(),
            flowState: FieldValue.delete(),
        };
        // Clear intermediate step-group keys
        for (const k of STEP_GROUP_KEYS) {
            update[k] = FieldValue.delete();
        }

        if (typeof nextState.furthestMajorIndex === 'number') {
            update.furthestMajorIndex = nextState.furthestMajorIndex;
        }
        for (const k of PROCESS_FIELD_KEYS) {
            if (k in nextState) update[k] = nextState[k];
        }

        await propRef.update(update);

        return {
            listingId,
            state: nextState,
            propertyStatus: nextStatus,
        };
    },

    getOwnerMostRecentProcess: async (userId) => {
        try {
            const snapshot = await db
                .collection('properties')
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
                if (!EDITABLE_STATUSES.has(data.status)) continue;
                return {
                    process: {
                        listingId: id,
                        state: assembleProcessState(data),
                        propertyStatus: data.status,
                        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                    },
                };
            }

            return { process: null };
        } catch (e) {
            logger.error('Error in getOwnerMostRecentProcess:', e);
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
            logger.error("Error saving draft field:", e);
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

            let data;
            try {
                const snap = await docRef.get();
                data = snap.data();
                if (data?.ownerId) {
                    await notificationService.createNotification({
                        userId: data.ownerId,
                        type: 'status_change',
                        severity: 'success',
                        title: 'Listing submitted',
                        message: 'Your listing has been submitted and is now being reviewed.',
                        listingId,
                        listingAddress: buildAddressName(data.location || {}),
                        actionUrl: `${process.env.FRONTEND_URL}/account/my-listings/${listingId}`,
                        actionLabel: 'View Listing',
                        sendEmail: false,
                    });
                }
            } catch (notifyErr) {
                logger.error('[notif] Failed to notify owner of listing submission:', notifyErr);
            }

            try {
                await actionService.generateActionsForListing(listingId, data ?? (await docRef.get()).data());
            } catch (actionErr) {
                logger.error('[actions] Failed to generate actions for listing:', actionErr);
            }
        } catch (e) {
            logger.error("Error marking property submitted:", e);
        }
    },

    /**
     * Uploads photos or attachments to Firebase Storage for a given listing
     * - Validates mediaType is either 'photos' or 'attachments'
     * - Verifies the requester owns the listing (skipped for admin calls)
     * - Validates each file's mime type and size against MEDIA_LIMITS
     * - Uploads each file to Storage under listingId/mediaType/
     * - Generates a long-lived signed URL for each file
     * - Appends uploaded file metadata to the listing's media array in Firestore
     */
    uploadMedia: async (listingId, files, mediaType, { uid, isAdmin, category } = {}) => {

        if (!['photos', 'attachments'].includes(mediaType)) {
            throw new AppError("Invalid media type", 400);
        }
        if (!files || files.length === 0) {
            throw new AppError("No files received", 400);
        }

        if (!isAdmin) {
            await assertListingOwnership(listingId, uid);
        }

        const limits = MEDIA_LIMITS[mediaType];
        if (files.length > limits.maxFiles) {
            throw new AppError(`You can upload at most ${limits.maxFiles} files at a time`, 400);
        }
        for (const file of files) {
            if (!limits.mimeTypes.includes(file.mimetype)) {
                throw new AppError(`"${file.originalname}" is not an accepted file type for ${mediaType}`, 400);
            }
            if (file.buffer.length > limits.maxBytes) {
                throw new AppError(`"${file.originalname}" is too large (max ${limits.maxBytes / (1024 * 1024)}MB)`, 400);
            }
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
                    category: mediaType === 'attachments' ? (category ?? null) : null,
                });
            }

            await db.collection('properties').doc(listingId).update({
                [`media.${mediaType}`]: FieldValue.arrayUnion(...mediaUrls),
                updatedAt: FieldValue.serverTimestamp(),
            });

            try {
                await actionService.completeUploadAction(listingId, mediaType);
            } catch (actionErr) {
                logger.error('[actions] Failed to auto-complete upload action:', actionErr);
            }

        } catch (firebaseErr) {
            throw new AppError(firebaseErr.message || "Failed to upload to Firebase", 500);
        }

        return mediaUrls;
    },

    removeMedia: async (listingId, mediaType, mediaUrl, { uid, isAdmin } = {}) => {
        if (!['photos', 'attachments'].includes(mediaType)) {
            throw new AppError("Invalid media type", 400);
        }

        if (!isAdmin) {
            await assertListingOwnership(listingId, uid);
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
            logger.error("Storage deletion failed (non-critical):", e.message);
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
            logger.error("Error in getListing:", e);
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
            logger.error("Error in getOwnerProperty:", e);
            throw new AppError(`Failed to fetch owner properties: ${e.message}`, 500);
        }
    },

    reorderMedia: async (listingId, mediaType, urls, { uid, isAdmin } = {}) => {
        try{
            if (!['photos', 'attachments'].includes(mediaType)) {
                throw new AppError('Invalid media type', 400);
            }

            if (!Array.isArray(urls) || urls.length === 0) {
                throw new AppError('urls must be a non-empty array', 400);
            }

            if (!isAdmin) {
                await assertListingOwnership(listingId, uid);
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
            if (e instanceof AppError) throw e;
            throw new AppError(e.message || "Failed to reorder media", 500);
        }
    },

    setVirtualTourLink: async (listingId, url, { uid, isAdmin } = {}) => {
        if (!isAdmin) {
            await assertListingOwnership(listingId, uid);
        }

        const docRef = db.collection('properties').doc(listingId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Property not found', 404);

        await docRef.update({
            'media.virtualTourLink': url || null,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return url || null;
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
            logger.error("Error in getOwnerMostRecentProperty:", e);
            throw new AppError(`Failed to fetch most recent owner property: ${e.message}`, 500);
        }
    },

    markStepCompleted: async (listingId, stepKey) => {
        try {
            const docRef = db.collection('properties').doc(listingId);
            const snap = await docRef.get();

            if (!snap.exists) {
                throw new AppError("Property not found", 404);
            }

            const data = snap.data();
            const validStepIds = getStepsForListing(getSelectedAddons(data)).map((s) => s.id);

            if (!validStepIds.includes(stepKey)) {
                throw new AppError(`"${stepKey}" is not a valid step for this listing`, 400);
            }

            await docRef.update({
                [`progressTracker.completedSteps.${stepKey}`]: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            if (e instanceof AppError) throw e;
            logger.error("Error marking step completed:", e);
            throw new AppError(`Failed to mark step as completed: ${e.message}`, 500);
        }
    },

    markStepIncomplete: async (listingId, stepKey) => {
        try {
            const docRef = db.collection('properties').doc(listingId);
            const snap = await docRef.get();

            if (!snap.exists) {
                throw new AppError("Property not found", 404);
            }

            const data = snap.data();
            const validStepIds = getStepsForListing(getSelectedAddons(data)).map((s) => s.id);

            if (!validStepIds.includes(stepKey)) {
                throw new AppError(`"${stepKey}" is not a valid step for this listing`, 400);
            }

            await docRef.update({
                [`progressTracker.completedSteps.${stepKey}`]: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            if (e instanceof AppError) throw e;
            logger.error("Error marking step incomplete:", e);
            throw new AppError(`Failed to mark step as incomplete: ${e.message}`, 500);
        }
    },

    /**
     * uid is the caller's own uid for the seller-facing route (ownership
     * enforced); pass null for the admin route, which is already gated by
     * verifyAdminFirebaseToken and needs to read any listing.
     */
    getProgressTracker: async (uid, listingId) => {
        try {
            const docRef = db.collection('properties').doc(listingId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                throw new AppError("Property not found", 404);
            }

            const data = docSnap.data();

            if (uid && data.ownerId !== uid) {
                throw new AppError("Unauthorized access to this property", 403);
            }

            const completedSteps = data.progressTracker?.completedSteps ?? {};
            const selectedAddons = getSelectedAddons(data);

            const steps = getStepsForListing(selectedAddons).map((step) => {
                const completedAt = completedSteps[step.id];
                return {
                    id: step.id,
                    label: step.label,
                    completed: Boolean(completedAt),
                    completedAt: completedAt?.toDate?.() || completedAt || null,
                };
            });

            const completedCount = steps.filter((s) => s.completed).length;

            return {
                totalSteps: steps.length,
                completedCount,
                percentage: Math.round((completedCount / steps.length) * 100),
                steps,
            };

        } catch (e) {
            if (e instanceof AppError) throw e;
            logger.error("Error in getProgressTracker:", e);
            throw new AppError(`Failed to fetch progress tracker: ${e.message}`, 500);
        }
    },

    /**
     * Persists the caller's addon selection onto the listing. Called just
     * before checkout so the price stripeService calculates always matches
     * what's stored (and what getProgressTracker reads back for the
     * dynamic addon steps).
     */
    saveSelectedAddons: async (userId, listingId, selectedAddons) => {
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

        // Belt-and-suspenders: Joi already checked these against ADDONS_BY_ID
        // at the route level, but this is the layer that actually writes to
        // Firestore and feeds Stripe pricing, so re-check here too.
        const invalidIds = selectedAddons.filter((id) => !ADDONS_BY_ID[id]);
        if (invalidIds.length > 0) {
            throw new AppError(`Unknown addon id(s): ${invalidIds.join(', ')}`, 400);
        }

        try {
            await docRef.update({
                selectedAddons,
                beforeLive: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            logger.error("Error saving selected addons:", e);
            throw new AppError("Failed to save selected addons", 500);
        }

        return selectedAddons;
    },
};

module.exports = propertyService