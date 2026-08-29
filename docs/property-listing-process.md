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
Replace the listing's viewed funnel steps. Step IDs match `steps` / `path` from `GET /schema` (e.g. `garage`, `contact`, `exterior`).

```json
{ "viewedSteps": ["garage", "contact"] }
```

Stored flat on the property document as `viewedSteps`. Requires `propertyType` to be set on the listing.

## GET /:listingId/viewed-steps/completion
Check whether stored viewed steps have their required fields filled, scoped to the listing's `propertyType`.

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
