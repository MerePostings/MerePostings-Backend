const Joi = require('joi');
const { TIME_OF_DAY } = require('../../data/actionTypes');

const listActionsQuerySchema = Joi.object({
    listingId: Joi.string().optional(),
    status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
    cursorId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
});

const slotSchema = Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    timeOfDay: Joi.string().valid(...TIME_OF_DAY).required(),
});

// A negotiation "batch" is always exactly 3 distinct date+timeOfDay slots.
// Reused as-is for both the user's schedule-request body and the admin's
// counter-time body.
const slotBatchSchema = Joi.array()
    .items(slotSchema)
    .length(3)
    .unique((a, b) => a.date === b.date && a.timeOfDay === b.timeOfDay)
    .required();

const schedulingBatchSchema = Joi.object({
    slots: slotBatchSchema,
});

const adminCounterTimeSchema = Joi.object({
    slots: slotBatchSchema,
    note: Joi.string().max(500).allow('', null).optional(),
});

const adminFinalizeTimeSchema = Joi.object({
    slotIndex: Joi.number().integer().min(0).max(2).required(),
});

module.exports = {
    listActionsQuerySchema,
    schedulingBatchSchema,
    adminCounterTimeSchema,
    adminFinalizeTimeSchema,
};
