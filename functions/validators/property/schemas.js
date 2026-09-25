const {z} = require("zod");
const {propertyTypeFields} = require("./fieldRegistry");
const {ADDONS_BY_ID} = require("../../data/addons");

const initiatePropertySchema = z.object({
  occupancyType: z.enum(["owner_occupied", "tenant_occupied", "vacant"]).optional(),
});

const draftFieldEnvelopeSchema = z.object({
  propertyType: z.enum(Object.keys(propertyTypeFields)),
  // .min(1): Joi.string().required() rejects "" by default (independent of
  // .required()) — plain z.string() would not, so this is added explicitly
  // wherever a Joi field was both required AND unconstrained by an
  // enum/regex (which already reject "" on their own).
  fieldName: z.string().min(1),
  // Joi.any().required() rejects only `undefined` — 0, false, and "" are all
  // valid fieldValues. Plain z.any() alone would treat a *missing* key as
  // valid too (z.any() includes undefined), so this explicit refine is what
  // actually replicates "required" here.
  fieldValue: z.any().refine((v) => v !== undefined, {message: "fieldValue is required"}),
// .strict(): unlike every other schema in this file (which only ever go
// through middlewares/validate.js), this schema is validated directly by
// middlewares/validateDraftField.js's own
// `draftFieldEnvelopeSchema.safeParse(req.body)` call, with no stripping of
// unknown keys. This mirrors this repo's pre-migration Joi behavior: back
// when validate.js was Joi-based, it always passed {stripUnknown: true},
// silently stripping unknown keys everywhere it was used — overriding
// Joi's own default of rejecting them. validateDraftField.js's direct
// `.validate(req.body, {abortEarly: false})` call never opted into that
// option, so it kept Joi's default of rejecting unknown keys with 400. This
// is the one schema in this file that needs .strict() to preserve that
// historical behavior — Zod's default object behavior (strip) would
// otherwise silently accept payloads with a stray extra key that used to
// be rejected.
}).strict();

const selectedAddonsSchema = z.object({
  selectedAddons: z.array(z.enum(Object.keys(ADDONS_BY_ID)))
      .refine((ids) => new Set(ids).size === ids.length, {message: "selectedAddons must not contain duplicates"})
      .default([]),
});

const listingProcessPatchSchema = z.object({
  state: z.record(z.string(), z.unknown()),
});

module.exports = {
  initiatePropertySchema,
  draftFieldEnvelopeSchema,
  selectedAddonsSchema,
  listingProcessPatchSchema,
};
