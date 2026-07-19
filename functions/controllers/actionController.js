const actionService = require('../services/actionService');
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const AppError = require('../utils/AppError');
const { buildIcs } = require('../utils/icsGenerator');

const actionController = {

    listActions: asyncErrorHandler(async (req, res) => {
        const { listingId, status, cursorId, limit } = req.query;
        const result = await actionService.listActions(req.user.uid, { listingId, status, cursorId, limit });
        res.status(200).json(result);
    }),

    getAction: asyncErrorHandler(async (req, res) => {
        const action = await actionService.getAction(req.user.uid, req.params.id);
        res.status(200).json({ action });
    }),

    submitSchedulingPreference: asyncErrorHandler(async (req, res) => {
        const action = await actionService.submitSchedulingPreference(req.user.uid, req.params.id, req.body);
        res.status(200).json({ action });
    }),

    confirmScheduledTime: asyncErrorHandler(async (req, res) => {
        const action = await actionService.confirmScheduledTime(req.user.uid, req.params.id);
        res.status(200).json({ action });
    }),

    downloadCalendarEvent: asyncErrorHandler(async (req, res) => {
        const action = await actionService.getAction(req.user.uid, req.params.id);
        if (!action.scheduledEvent) {
            throw new AppError('No confirmed appointment for this action', 404);
        }

        const ics = buildIcs({
            uid: action.id,
            title: action.scheduledEvent.title,
            description: action.scheduledEvent.description,
            location: action.scheduledEvent.location,
            startDateTime: action.scheduledEvent.startDateTime,
            endDateTime: action.scheduledEvent.endDateTime,
        });

        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', `attachment; filename="appointment-${action.id}.ics"`);
        res.status(200).send(ics);
    }),

};

module.exports = actionController;
