const {z} = require("zod");
const {NOTIFICATION_TYPES} = require("../../data/notificationTypes");

const listNotificationsQuerySchema = z.object({
  cursorId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const preferencesPatchSchema = z.object(
    NOTIFICATION_TYPES.reduce((schema, type) => {
      schema[type] = z.boolean().optional();
      return schema;
    }, {}),
).refine((obj) => Object.keys(obj).length >= 1, {message: "at least one preference must be provided"});

module.exports = {
  listNotificationsQuerySchema,
  preferencesPatchSchema,
};
