# IMPORTANT
After changing any part of the schema, bump `PROPERTY_SCHEMA_VERSION` in [`fieldRegistry.js`](../functions/validators/property/fieldRegistry.js).

# Important property listing endpoints:

## GET /schema
Fetch the JSON schema of the listing process for validation.

Response includes:
- `version` — from `PROPERTY_SCHEMA_VERSION` in [`fieldRegistry.js`](../functions/validators/property/fieldRegistry.js); bump when registry changes
- `steps` — valid funnel step IDs per property type (same as field `path` / storage location, e.g. `garage`, `contact`)
- `fieldsByStep` — fields grouped by step ID for each property type
- `commonFields` / `propertyTypeFields` — flat field index with `path`, `step`, `dbKey`, `schema`

## GET /schema/version
Fetch the version of the schema before fetching the schema itself. (for caching purposes)

Version constant lives in [`fieldRegistry.js`](../functions/validators/property/fieldRegistry.js) as `PROPERTY_SCHEMA_VERSION`.

## POST /initiate
Initiate a new property listing document under the `properties` collection.

## PATCH /:listingId/listing-process
Endpoint for updating the property details with field level validation.

## PUT /:listingId/viewed-steps
The frontend sends the **full** viewed-step list every time. This endpoint **replaces** `viewedSteps` (it does not append). Completeness for the progress bar then checks required fields on **every** stored viewed step.

Step IDs match `steps` / `path` from `GET /schema` (e.g. `garage`, `contact`, `exterior`). Requires `propertyType` to be set on the listing.

```json
{ "viewedSteps": ["garage", "contact"] }
```

## GET /:listingId/viewed-steps/completion
Check whether stored viewed steps have their required fields filled, scoped to the listing's `propertyType`.

## GET /:listingId/listing-process/completion
Final completeness check: every required field for the listing's `propertyType`, including steps the user never viewed. Response: `{ complete, steps, missingFields }`.

`POST /create-client-secret/:listingId` runs this same check and returns 400 (with `errors`) if anything required is still empty. Payment does not start until the listing is complete.

# The rest of the endpoints 
TODO: Why are there so many GET endpoints for `listing-process` and `listingId`?

GET /:listingId/listing-process
GET /listing-process/:listingId
GET /listings/:id

POST /create-client-secret/:listingId
POST /request-refund/:listingId
POST /:listingId/media/:mediaType
PATCH /:listingId/media/:mediaType/reorder
DELETE /:listingId/media/:mediaType
PATCH /:listingId/virtual-tour-link

GET /get-addon-registry
GET /get-owner-properties
GET /get-owner-most-recent-property
