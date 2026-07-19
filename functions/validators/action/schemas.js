const Joi = require('joi');
const { TIME_OF_DAY } = require('../../data/actionTypes');

const listActionsQuerySchema = Joi.object({
    listingId: Joi.string().optional(),
    status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
    cursorId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
});

const schedulingPreferenceSchema = Joi.object({
    preferredDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    preferredTimeOfDay: Joi.string().valid(...TIME_OF_DAY).required(),
});

const adminProposeTimeSchema = Joi.object({
    proposedDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    proposedTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    proposedNote: Joi.string().max(500).allow('', null).optional(),
});

module.exports = {
    listActionsQuerySchema,
    schedulingPreferenceSchema,
    adminProposeTimeSchema,
};
