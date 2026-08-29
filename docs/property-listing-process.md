# IMPORTANT 
After changing any part of the schema, the version should be incremented.

# Important property listing endpoints:

## GET /schema
Fetch the JSON schema of the listing process for validation.

## GET /schema/version
Fetch the version of the schema before fetching the schema itself. (for caching purposes)

## POST /initiate
Initiate a new property listing document under the `properties` collection.

## PATCH /:listingId/listing-process
Endpoint for updating the property details with field level validation.

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
