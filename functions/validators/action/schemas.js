const {z} = require("zod");
const {TIME_OF_DAY} = require("../../data/actionTypes");

const listActionsQuerySchema = z.object({
  listingId: z.string().min(1).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  cursorId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeOfDay: z.enum(TIME_OF_DAY),
});

const slotBatchSchema = z.array(slotSchema)
    .length(3)
    .refine(
        (slots) => new Set(slots.map((s) => `${s.date}|${s.timeOfDay}`)).size === slots.length,
        {message: "slots must be unique"},
    );

const schedulingBatchSchema = z.object({
  slots: slotBatchSchema,
});

const adminCounterTimeSchema = z.object({
  slots: slotBatchSchema,
  note: z.string().max(500).nullish(),
});

const adminFinalizeTimeSchema = z.object({
  slotIndex: z.number().int().min(0).max(2),
});

module.exports = {
  listActionsQuerySchema,
  schedulingBatchSchema,
  adminCounterTimeSchema,
  adminFinalizeTimeSchema,
};
