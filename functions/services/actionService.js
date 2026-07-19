const { db } = require('../config/db');
const AppError = require('../utils/AppError');
const { FieldValue } = require('firebase-admin/firestore');
const { getRequiredActionsForListing } = require('../data/actionRequirements');
const notificationService = require('./notificationService');

// NOTE: propertyService.js requires this file (to call generateActionsForListing
// / completeUploadAction from markSubmitted / uploadMedia). To avoid a circular
// require resolving to a half-initialized module, propertyService is required
// lazily (inside the functions below) rather than at module scope here — by
// the time any action is actually invoked at request time, propertyService.js
// has already finished loading during app boot.

const buildAddressName = (location = {}) => {
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
        return [parts, unit, municipality].filter(Boolean).join(', ') || null;
    } catch (e) {
        return null;
    }
};

const actionDocId = (listingId, key) => `${listingId}_${key}`;

const toResponse = (id, data) => ({
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    completedAt: data.completedAt?.toDate?.() || data.completedAt,
});

const cascadeCompleteStep = async (listingId, progressStepId) => {
    if (!progressStepId) return;
    try {
        const propertyService = require('./propertyService');
        await propertyService.markStepCompleted(listingId, progressStepId);
    } catch (stepErr) {
        console.error('[actions] Failed to cascade-complete progress step:', stepErr);
    }
};

const actionService = {

    // exposed so dashboardService can shape actions fetched by id (via db.getAll)
    // the same way listActions/getAction already do, without duplicating the mapping
    formatAction: toResponse,

    /**
     * Called (best-effort) from propertyService.markSubmitted once a listing
     * is paid for. Idempotent via deterministic doc ids, so Stripe webhook
     * retries never create duplicate actions.
     */
    generateActionsForListing: async (listingId, propertyData) => {
        const { ownerId, selectedAddons = [], location } = propertyData || {};
        if (!ownerId) return;

        const listingAddress = buildAddressName(location || {});
        const blueprints = getRequiredActionsForListing(selectedAddons);

        let createdTitles = [];

        if (blueprints.length > 0) {
            const pointerRef = db.collection('dashboardPointers').doc(ownerId);
            const docRefs = blueprints.map((blueprint) =>
                db.collection('actions').doc(actionDocId(listingId, blueprint.key))
            );

            await db.runTransaction(async (tx) => {
                const snaps = await tx.getAll(...docRefs, pointerRef);
                const pointerSnap = snaps[snaps.length - 1];
                const titles = [];
                const createdIds = [];

                blueprints.forEach((blueprint, i) => {
                    if (snaps[i].exists) return;

                    tx.set(docRefs[i], {
                        userId: ownerId,
                        listingId,
                        listingAddress,
                        type: blueprint.type,
                        status: 'pending',
                        title: blueprint.title,
                        description: blueprint.description,
                        ctaLabel: blueprint.ctaLabel,
                        ctaUrl: `${process.env.FRONTEND_URL}/account/my-listings/${listingId}`,
                        progressStepId: blueprint.progressStepId,
                        requiresScheduling: blueprint.requiresScheduling,
                        schedulingRequest: null,
                        scheduledEvent: null,
                        dueDate: null,
                        completedAt: null,
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    });

                    titles.push(blueprint.title);
                    createdIds.push(docRefs[i].id);
                });

                if (createdIds.length > 0) {
                    const currentIds = pointerSnap.exists ? (pointerSnap.data().recentActionIds || []) : [];
                    tx.set(pointerRef, {
                        ownerId,
                        recentActionIds: [...createdIds, ...currentIds].slice(0, 3),
                        updatedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                }

                createdTitles = titles;
            });
        }

        if (createdTitles.length > 0) {
            try {
                await notificationService.createNotification({
                    userId: ownerId,
                    type: 'action_update',
                    severity: 'info',
                    title: 'A few more things to finish your listing',
                    message: `You have ${createdTitles.length} action${createdTitles.length > 1 ? 's' : ''} to complete before your listing goes live.`,
                    listingId,
                    listingAddress,
                    actionUrl: `${process.env.FRONTEND_URL}/account/my-listings/${listingId}`,
                    actionLabel: 'View Actions',
                    sendEmail: false,
                });
            } catch (notifyErr) {
                console.error('[actions] Failed to notify owner of new actions:', notifyErr);
            }
        }
    },

    /**
     * Actions are bounded per user (a handful per listing, created only at
     * submission), so — like propertyService.getOwnerMostRecentProcess —
     * filter/sort in memory rather than adding composite Firestore indexes
     * for the optional listingId/status filters.
     */
    listActions: async (userId, { listingId, status, cursorId, limit } = {}) => {
        const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

        const snapshot = await db.collection('actions').where('userId', '==', userId).get();

        let actions = snapshot.docs
            .map((doc) => toResponse(doc.id, doc.data()))
            .filter((a) => (listingId ? a.listingId === listingId : true))
            .filter((a) => (status ? a.status === status : true))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (cursorId) {
            const idx = actions.findIndex((a) => a.id === cursorId);
            if (idx >= 0) actions = actions.slice(idx + 1);
        }

        const hasMore = actions.length > pageSize;
        const page = actions.slice(0, pageSize);

        return {
            actions: page,
            nextCursor: hasMore ? page[page.length - 1].id : null,
        };
    },

    getAction: async (userId, actionId) => {
        const snap = await db.collection('actions').doc(actionId).get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (data.userId !== userId) throw new AppError('Unauthorized access to this action', 403);

        return toResponse(snap.id, data);
    },

    submitSchedulingPreference: async (userId, actionId, { preferredDate, preferredTimeOfDay }) => {
        const docRef = db.collection('actions').doc(actionId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (data.userId !== userId) throw new AppError('Unauthorized access to this action', 403);
        if (!data.requiresScheduling) throw new AppError('This action does not require scheduling', 400);
        if (data.status === 'completed') throw new AppError('This action has already been completed', 409);
        if (data.schedulingRequest?.state === 'confirmed') {
            throw new AppError('This appointment has already been confirmed', 409);
        }

        await docRef.update({
            schedulingRequest: {
                state: 'requested',
                preferredDate,
                preferredTimeOfDay,
                requestedAt: FieldValue.serverTimestamp(),
                proposedDate: null,
                proposedTime: null,
                proposedNote: null,
                proposedAt: null,
                confirmedAt: null,
            },
            status: 'in_progress',
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updated = await docRef.get();
        return toResponse(updated.id, updated.data());
    },

    confirmScheduledTime: async (userId, actionId) => {
        const docRef = db.collection('actions').doc(actionId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (data.userId !== userId) throw new AppError('Unauthorized access to this action', 403);
        if (data.schedulingRequest?.state !== 'proposed') {
            throw new AppError('No proposed time is awaiting your confirmation', 409);
        }

        const { proposedDate, proposedTime } = data.schedulingRequest;
        const startDateTime = new Date(`${proposedDate}T${proposedTime}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

        const scheduledEvent = {
            title: data.title,
            description: data.description,
            location: data.listingAddress || null,
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
        };

        await docRef.update({
            'schedulingRequest.state': 'confirmed',
            'schedulingRequest.confirmedAt': FieldValue.serverTimestamp(),
            scheduledEvent,
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await cascadeCompleteStep(data.listingId, data.progressStepId);

        try {
            await notificationService.createNotification({
                userId,
                type: 'action_update',
                severity: 'success',
                title: 'Appointment confirmed',
                message: `Your appointment for "${data.title}" is confirmed for ${proposedDate}.`,
                listingId: data.listingId,
                listingAddress: data.listingAddress,
                actionUrl: `${process.env.FRONTEND_URL}/account/my-listings/${data.listingId}`,
                actionLabel: 'View Listing',
                sendEmail: false,
            });
        } catch (notifyErr) {
            console.error('[actions] Failed to notify owner of confirmed appointment:', notifyErr);
        }

        const updated = await docRef.get();
        return toResponse(updated.id, updated.data());
    },

    /**
     * Internal — called (best-effort) from propertyService.uploadMedia.
     * Must never throw: a failure here should not fail the upload itself.
     */
    completeUploadAction: async (listingId, mediaType) => {
        const key = mediaType === 'photos' ? 'photo_upload'
            : mediaType === 'attachments' ? 'document_upload'
                : null;
        if (!key) return;

        const docRef = db.collection('actions').doc(actionDocId(listingId, key));
        const snap = await docRef.get();
        if (!snap.exists || snap.data().status === 'completed') return;

        await docRef.update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    },

    // --- Admin ---

    adminListSchedulingQueue: async () => {
        const snapshot = await db.collection('actions')
            .where('requiresScheduling', '==', true)
            .where('schedulingRequest.state', '==', 'requested')
            .get();

        return snapshot.docs
            .map((doc) => toResponse(doc.id, doc.data()))
            .sort((a, b) => new Date(a.schedulingRequest.requestedAt) - new Date(b.schedulingRequest.requestedAt));
    },

    adminProposeTime: async (actionId, { proposedDate, proposedTime, proposedNote }) => {
        const docRef = db.collection('actions').doc(actionId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (!data.requiresScheduling) throw new AppError('This action does not require scheduling', 400);
        if (!['requested', 'proposed'].includes(data.schedulingRequest?.state)) {
            throw new AppError('This action has no active scheduling request', 409);
        }

        await docRef.update({
            'schedulingRequest.state': 'proposed',
            'schedulingRequest.proposedDate': proposedDate,
            'schedulingRequest.proposedTime': proposedTime,
            'schedulingRequest.proposedNote': proposedNote || null,
            'schedulingRequest.proposedAt': FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        try {
            await notificationService.createNotification({
                userId: data.userId,
                type: 'action_update',
                severity: 'info',
                title: 'Review your proposed appointment time',
                message: `We've proposed ${proposedDate} at ${proposedTime} for "${data.title}". Please confirm if this works for you.`,
                listingId: data.listingId,
                listingAddress: data.listingAddress,
                actionUrl: `${process.env.FRONTEND_URL}/account/my-listings/${data.listingId}`,
                actionLabel: 'Review & Confirm',
                sendEmail: true,
            });
        } catch (notifyErr) {
            console.error('[actions] Failed to notify owner of proposed time:', notifyErr);
        }

        const updated = await docRef.get();
        return toResponse(updated.id, updated.data());
    },

    adminCompleteAction: async (actionId) => {
        const docRef = db.collection('actions').doc(actionId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (data.status !== 'completed') {
            await docRef.update({
                status: 'completed',
                completedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await cascadeCompleteStep(data.listingId, data.progressStepId);
        }

        const updated = await docRef.get();
        return toResponse(updated.id, updated.data());
    },

};

module.exports = actionService;
