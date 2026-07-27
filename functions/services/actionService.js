const logger = require('firebase-functions/logger');
const { DateTime } = require('luxon');
const { db } = require('../config/db');
const AppError = require('../utils/AppError');
const { FieldValue } = require('firebase-admin/firestore');
const { getRequiredActionsForListing } = require('../data/actionRequirements');
const { TIME_OF_DAY_WINDOWS } = require('../data/actionTypes');
const notificationService = require('./notificationService');

const TIMEZONE = 'America/Toronto';

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

// Appends the outgoing active batch (if any) to the negotiation's history
// log as a plain object. Not done via FieldValue.arrayUnion(): arrayUnion
// can't hold a nested serverTimestamp() sentinel, and it de-dupes by deep
// equality, which would silently drop a valid re-submission of an identical
// batch (e.g. the user re-sending exactly the 3 slots the admin countered
// with). schedulingRequest.submittedAt is a committed Timestamp by the time
// this runs (read back from the doc), so .toDate() is always safe here.
const buildSchedulingHistory = (previousSchedulingRequest) => {
    if (!previousSchedulingRequest) return [];
    return [
        ...(previousSchedulingRequest.history || []),
        {
            proposedBy: previousSchedulingRequest.proposedBy,
            slots: previousSchedulingRequest.slots,
            note: previousSchedulingRequest.note ?? null,
            submittedAt: previousSchedulingRequest.submittedAt?.toDate?.().toISOString()
                ?? new Date().toISOString(),
        },
    ];
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
                logger.error('[actions] Failed to notify owner of new actions:', notifyErr);
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

    /**
     * User submits (or re-submits, in response to an admin counter) a batch
     * of exactly 3 candidate {date, timeOfDay} slots. Only ever allowed as
     * the first submission or in response to an admin counter-offer -- once
     * the batch is awaiting the admin ('requested') the user cannot
     * overwrite it, and a confirmed appointment can never be reopened here.
     */
    submitSchedulingBatch: async (userId, actionId, { slots }) => {
        const docRef = db.collection('actions').doc(actionId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (data.userId !== userId) throw new AppError('Unauthorized access to this action', 403);
        if (!data.requiresScheduling) throw new AppError('This action does not require scheduling', 400);
        if (data.status === 'completed') throw new AppError('This action has already been completed', 409);

        const currentState = data.schedulingRequest?.state;
        if (currentState === 'confirmed') {
            throw new AppError('This appointment has already been confirmed', 409);
        }
        if (currentState === 'requested') {
            throw new AppError('Your submitted times are already awaiting a response from the admin', 409);
        }

        const today = DateTime.now().setZone(TIMEZONE).startOf('day');
        const pastSlot = slots.find(
            ({ date }) => DateTime.fromISO(date, { zone: TIMEZONE }).startOf('day') < today
        );
        if (pastSlot) {
            throw new AppError(`${pastSlot.date} is in the past`, 400);
        }

        await docRef.update({
            schedulingRequest: {
                state: 'requested',
                slots,
                proposedBy: 'user',
                note: null,
                submittedAt: FieldValue.serverTimestamp(),
                history: buildSchedulingHistory(data.schedulingRequest),
                confirmedSlotIndex: null,
                finalTime: null,
                confirmedAt: null,
            },
            status: 'in_progress',
            updatedAt: FieldValue.serverTimestamp(),
        });

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
            .where('schedulingRequest.state', 'in', ['requested', 'countered'])
            .get();

        return snapshot.docs
            .map((doc) => toResponse(doc.id, doc.data()))
            .sort((a, b) => new Date(a.schedulingRequest.submittedAt) - new Date(b.schedulingRequest.submittedAt));
    },

    /**
     * All confirmed appointments across every seller, soonest first — the
     * counterpart to adminListSchedulingQueue (which explicitly excludes
     * 'confirmed'). Used by the admin app's Confirmed Appointments page.
     */
    adminListConfirmedAppointments: async () => {
        const snapshot = await db.collection('actions')
            .where('requiresScheduling', '==', true)
            .where('schedulingRequest.state', '==', 'confirmed')
            .get();

        return snapshot.docs
            .map((doc) => toResponse(doc.id, doc.data()))
            .sort((a, b) => new Date(a.scheduledEvent?.startDateTime) - new Date(b.scheduledEvent?.startDateTime));
    },

    /**
     * Admin rejects all 3 of the user's slots and counters with 3 new ones,
     * bouncing the turn back to the user. Only allowed while the active
     * batch was submitted by the user ('requested') -- the admin can't
     * counter their own prior counter-offer.
     */
    adminCounterTime: async (actionId, { slots, note }) => {
        const docRef = db.collection('actions').doc(actionId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (!data.requiresScheduling) throw new AppError('This action does not require scheduling', 400);
        if (data.schedulingRequest?.state !== 'requested') {
            throw new AppError('This action has no active scheduling request awaiting a counter-offer', 409);
        }

        await docRef.update({
            schedulingRequest: {
                state: 'countered',
                slots,
                proposedBy: 'admin',
                note: note || null,
                submittedAt: FieldValue.serverTimestamp(),
                history: buildSchedulingHistory(data.schedulingRequest),
                confirmedSlotIndex: null,
                finalTime: null,
                confirmedAt: null,
            },
            updatedAt: FieldValue.serverTimestamp(),
        });

        try {
            await notificationService.createNotification({
                userId: data.userId,
                type: 'action_update',
                severity: 'info',
                title: 'New appointment times proposed',
                message: `We've proposed 3 new times for "${data.title}". Please review and pick one, or suggest different times.`,
                listingId: data.listingId,
                listingAddress: data.listingAddress,
                actionUrl: `${process.env.FRONTEND_URL}/account/my-listings/${data.listingId}`,
                actionLabel: 'Review Times',
                sendEmail: true,
            });
        } catch (notifyErr) {
            logger.error('[actions] Failed to notify owner of countered scheduling times:', notifyErr);
        }

        const updated = await docRef.get();
        return toResponse(updated.id, updated.data());
    },

    /**
     * The only path to a confirmed appointment. Admin picks one of the
     * user's 3 submitted slots and pins an exact HH:MM within that slot's
     * timeOfDay window. Race-safe against double-booking: the conflict
     * check and the write happen inside one transaction.
     */
    adminFinalizeTime: async (actionId, { slotIndex }) => {
        const docRef = db.collection('actions').doc(actionId);

        const data = await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) throw new AppError('Action not found', 404);
            const actionData = snap.data();

            if (!actionData.requiresScheduling) throw new AppError('This action does not require scheduling', 400);
            if (actionData.schedulingRequest?.state !== 'requested') {
                throw new AppError('Only a set of times submitted by the user can be finalized', 409);
            }

            const slot = actionData.schedulingRequest.slots?.[slotIndex];
            if (!slot) throw new AppError('Invalid slot index', 400);

            // Finalizing books the whole timeOfDay window as the appointment --
            // there's no separate admin-entered exact start time anymore.
            const window = TIME_OF_DAY_WINDOWS[slot.timeOfDay];
            const startDateTime = DateTime.fromISO(`${slot.date}T${window.start}`, { zone: TIMEZONE });
            const endDateTime = DateTime.fromISO(`${slot.date}T${window.end}`, { zone: TIMEZONE });

            // Candidate-conflict query: other confirmed appointments for THIS
            // listing only. Two equality filters (listingId, schedulingRequest.state)
            // are covered by Firestore's automatic indexing -- no composite index
            // needed. A property only ever has a handful of scheduling-required
            // actions (verification, photography, home inspection), so this
            // result set is small and the overlap check runs in memory.
            const conflictQuery = db.collection('actions')
                .where('listingId', '==', actionData.listingId)
                .where('schedulingRequest.state', '==', 'confirmed');

            const conflictSnap = await tx.get(conflictQuery);

            const newStart = startDateTime.toMillis();
            const newEnd = endDateTime.toMillis();

            const hasConflict = conflictSnap.docs.some((doc) => {
                if (doc.id === actionId) return false;
                const ev = doc.data().scheduledEvent;
                if (!ev) return false;
                const existingStart = new Date(ev.startDateTime).getTime();
                const existingEnd = new Date(ev.endDateTime).getTime();
                return newStart < existingEnd && newEnd > existingStart;
            });

            if (hasConflict) {
                throw new AppError('This window conflicts with another confirmed appointment for this listing. Please choose a different slot.', 409);
            }

            const scheduledEvent = {
                title: actionData.title,
                description: actionData.description,
                location: actionData.listingAddress || null,
                startDateTime: startDateTime.toJSDate().toISOString(),
                endDateTime: endDateTime.toJSDate().toISOString(),
            };

            tx.update(docRef, {
                'schedulingRequest.state': 'confirmed',
                'schedulingRequest.confirmedSlotIndex': slotIndex,
                'schedulingRequest.finalTime': window.start,
                'schedulingRequest.confirmedAt': FieldValue.serverTimestamp(),
                scheduledEvent,
                status: 'completed',
                completedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            return actionData;
        });

        // Confirming an appointment no longer auto-completes the matching
        // progress-tracker step -- only an explicit admin action on the
        // Progress Tracker panel (propertyService.markStepCompleted via the
        // admin progress-tracker endpoint) marks a step done.

        try {
            await notificationService.createNotification({
                userId: data.userId,
                type: 'action_update',
                severity: 'success',
                title: 'Appointment confirmed',
                message: `Your appointment for "${data.title}" is confirmed.`,
                listingId: data.listingId,
                listingAddress: data.listingAddress,
                actionUrl: `${process.env.FRONTEND_URL}/account/my-listings/${data.listingId}`,
                actionLabel: 'View Listing',
                sendEmail: true,
            });
        } catch (notifyErr) {
            logger.error('[actions] Failed to notify owner of confirmed appointment:', notifyErr);
        }

        const updated = await docRef.get();
        return toResponse(updated.id, updated.data());
    },

    adminCompleteAction: async (actionId) => {
        const docRef = db.collection('actions').doc(actionId);
        const snap = await docRef.get();
        if (!snap.exists) throw new AppError('Action not found', 404);

        const data = snap.data();
        if (data.requiresScheduling && data.schedulingRequest?.state !== 'confirmed') {
            throw new AppError('This action requires a finalized appointment before it can be completed', 409);
        }
        if (data.status !== 'completed') {
            await docRef.update({
                status: 'completed',
                completedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        const updated = await docRef.get();
        return toResponse(updated.id, updated.data());
    },

};

module.exports = actionService;
