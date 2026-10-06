TO GET STARTED

1. cd functions

2. npm i

3. create 3 new files under functions root - .env, .env.development, .env.production

4. add env variables

   for .env
   NODE_ENV="development"
   SIGNATURE=
   APIKEY=
   AUTHDOMAIN=
   PROJECTID=
   STORAGEBUCKET=
   MESSAGINGSENDERID=
   APPID=
   EMAILUSER=
   EMAILPASS=

   for .env.development

   for .env.production

5. add service account private key under functions root

6. npm start

\** To access the emulator local storage rename the firebase-export*to imported-data before rerunning the server

## Property schema API (versioned, cacheable)

Both endpoints are public (no auth) — the schema contains no PII.

### `GET /v1/property/schema`

Returns the full listing schema the frontend renders from:
`{ version, $schema, propertyTypes, propertyTypeOptions, stages, commonFields, propertyTypeFields, sections }`.

- `version` is a 12-char sha256 content hash of the payload. It changes on
  every registry change — no manual bump needed, new deploy = new hash.
- Headers: `ETag: "<version>"`,
  `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
- Conditional request: send `If-None-Match: "<version>"` → `304` with empty
  body when the schema hasn't changed.

### `GET /v1/property/schema/version`

Lightweight poll endpoint. Returns `{ version }` only, with the same `ETag`.

- Headers: `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- Supports `If-None-Match` → `304`, same as above.

### Frontend caching contract

1. On boot, `GET /v1/property/schema/version` (send stored `ETag` via
   `If-None-Match`; `304` means "keep what you have").
2. Cache the full schema in `localStorage` under `mp-schema-<version>`.
3. If server version differs from the stored one,
   `GET /v1/property/schema` (conditional) and replace the cache, evicting
   old `mp-schema-*` keys.
4. If the version fetch fails, fall back to the last cached schema; if none
   exists, fetch the full schema unconditionally.
