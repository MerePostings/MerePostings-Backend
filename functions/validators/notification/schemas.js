const Joi = require('joi');
const { NOTIFICATION_TYPES } = require('../../data/notificationTypes');

const listNotificationsQuerySchema = Joi.object({
    cursorId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
});

const preferencesPatchSchema = Joi.object(
    NOTIFICATION_TYPES.reduce((schema, type) => {
        schema[type] = Joi.boolean();
        return schema;
    }, {})
).min(1);

module.exports = {
    listNotificationsQuerySchema,
    preferencesPatchSchema,
};
