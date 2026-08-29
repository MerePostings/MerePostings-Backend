# Listing process (frontend)

Base path: `/v1/property`

Rule: **empty required fields are OK until checkout. Invalid values are never stored.**

Schema routes are public. Everything else needs a Firebase token + verified email.

---

## Flow

1. **Cache the schema**
   - `GET /schema/version` → `{ version }`
   - If local cache already has that version, use it.
   - Otherwise `GET /schema` once and store the whole payload keyed by `version`.
   - Compile Ajv from the cached field `schema` objects. Do not refetch per step.

2. **Start a listing** — `POST /initiate` → `{ listingId }`

3. **Walk the funnel**
   - User may skip required fields and go to the next step.
   - On leave: `PUT /:listingId/viewed-steps` with the **full** list of viewed steps (backend will overwrite, not append).
   - If they typed something: validate with Ajv (reject invalid; allow empty required) then `PATCH /:listingId/listing-process`. Backend validates again and saves to the database.

4. **Progress bar** — `GET /:listingId/viewed-steps/completion`
   - Get incompleted **viewed** steps (empty required fields on steps they already opened).

5. **Before payment**
   - `GET /:listingId/listing-process/completion` — every required field for the property type (including never-viewed steps). Show what's missing.
   - `POST /create-client-secret/:listingId` runs the same check. Incomplete → `400` with `errors`. Payment does not start.

Reload a draft with `GET /:listingId/listing-process` (`fields` + `viewedSteps`).

---

## Schema cache

`GET /schema/version`

```json
{ "version": 1 }
```

`GET /schema` (full document — cache this)

| Key | Use |
|---|---|
| `version` | cache key |
| `steps[propertyType]` | valid step IDs (`garage`, `contact`, `exterior`, …) |
| `fieldsByStep[propertyType][stepId]` | fields on that step + JSON Schema for Ajv |
| `commonFields` / `propertyTypeFields` | flat field index (`path`, `step`, `dbKey`, `schema`) |

Step ID = storage path = `viewedSteps` entry.

When `version` changes, drop the old cache and refetch `/schema`.

**Ajv:** use draft 2020-12 + `ajv-formats` (`format: "email"`). Mid-funnel: block invalid values only. Before pay: completeness endpoints.

---

## Endpoints

### `POST /initiate`

Creates the listing. Optional `{ "occupancyType": "vacant" }`.

### `GET /:listingId/listing-process`

```json
{
  "process": {
    "listingId": "…",
    "propertyType": "detached",
    "fields": { "garage": { "garageType": "attached" } },
    "viewedSteps": ["garage", "contact"],
    "propertyStatus": "draft"
  }
}
```

### `PATCH /:listingId/listing-process`

Nested by step/path. Only sent fields are validated and saved. Omit a required field → it stays empty. Invalid value → `400`.

```json
{
  "propertyType": "detached",
  "garage": { "garageType": "attached" },
  "contact": { "sellerEmail": "jane@example.com" }
}
```

`propertyType` is required on the first save (or already on the listing). Changing type after it’s set → `409`.

### `PUT /:listingId/viewed-steps`

Send the **complete** list every time. Replaces what’s stored. `propertyType` must already be set.

```json
{ "viewedSteps": ["exterior", "garage", "contact"] }
```

Unknown step ID → `400`.

### `GET /:listingId/viewed-steps/completion`

Progress bar: required fields on **stored viewed steps** only.

```json
{
  "listingId": "…",
  "propertyType": "detached",
  "viewedSteps": ["garage", "contact"],
  "steps": [
    { "stepId": "garage", "applicable": true, "complete": true, "missingFields": [] },
    { "stepId": "contact", "applicable": true, "complete": false, "missingFields": ["contact.sellerFullName"] }
  ]
}
```

### `GET /:listingId/listing-process/completion`

Final check: **all** required fields for the type.

```json
{
  "listingId": "…",
  "propertyType": "detached",
  "complete": false,
  "missingFields": ["pricing.askingPrice", "contact.sellerFullName"],
  "steps": [{ "stepId": "contact", "applicable": true, "complete": false, "missingFields": ["contact.sellerFullName"] }]
}
```

Needs `propertyType` on the listing.

### `POST /create-client-secret/:listingId`

`{ "selectedAddons": [] }` then Stripe client secret. **Blocked** until listing completion is true.

Incomplete:

```json
{
  "message": "Listing has incomplete required fields",
  "errors": [{ "field": "contact.sellerFullName", "message": "Required" }]
}
```

---

## Also used in this funnel

| Method | Path |
|---|---|
| GET | `/get-addon-registry` |
| GET | `/listings/:id` |
| GET | `/get-owner-properties` |
| GET | `/get-owner-most-recent-property` |
| POST | `/:listingId/media/:mediaType` |
| PATCH | `/:listingId/media/:mediaType/reorder` |
| DELETE | `/:listingId/media/:mediaType` |
| PATCH | `/:listingId/virtual-tour-link` |
| POST | `/request-refund/:listingId` |
| GET | `/listing-process/:listingId` (post-submit progress tracker — not the funnel) |
