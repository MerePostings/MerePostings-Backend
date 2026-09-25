const {z} = require("zod");
const Address = require("@hapi/address");
// @hapi/tlds is pinned to ^1.1.7 in package.json (not ^2.x) because:
//   1. @hapi/tlds 2.0.0 is ESM-only, which breaks this CommonJS/Jest codebase.
//   2. The 1.x line is the same major line Joi itself depends on internally,
//      so this keeps TLD-plausibility behavior aligned with pre-migration Joi.
//   3. Revisit this pin if the codebase ever moves to ESM — the 1.x line
//      will not receive new gTLD delegations forever.
const {tlds} = require("@hapi/tlds");

/**
 * Email schema with real TLD-plausibility checking, restoring parity with
 * the old Joi.string().email() behavior.
 *
 * Zod's own `.email()`/`z.email()` only checks address *shape* — it does
 * not check whether the TLD is real/plausible, so it would silently accept
 * something like "seller@gmail.con". Joi's `.email()` rejects that because
 * it delegates to `@hapi/address`, which checks the domain's TLD against a
 * real, maintained TLD list (`@hapi/tlds`, the same list Joi itself uses).
 *
 * The base `z.string().email()` call is kept (not replaced) so that
 * `z.toJSONSchema()` still emits `format: "email"` (plus a shape pattern) on
 * the published JSON Schema — a bare `.refine()` alone has no JSON Schema
 * representation and would silently drop that info for API consumers like
 * GET /v1/property/schema. The `.refine()` layered on top adds the stricter
 * TLD-plausibility check that `.email()` alone doesn't perform.
 *
 * @returns {import('zod').ZodType<string>}
 */
const emailSchema = () =>
  z.string().email().refine(
      (value) => Address.isEmailValid(value, {tlds: {allow: tlds}}),
      {message: "Please enter a valid email address"},
  );

module.exports = {emailSchema};
