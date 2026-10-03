jest.mock("../../services/propertyService");
jest.mock("../../services/stripeService");
jest.mock("../../config/stripe");

const express = require("express");
const request = require("supertest");
const propertyRoutes = require("../propertyRoutes");
const {getPropertySchemaVersion} = require("../../utils/buildPropertySchemaResponse");

// Mount the real property router: /schema and /schema/version are public,
// so no auth stubs are needed for these two paths.
function buildApp() {
  const app = express();
  app.use("/", propertyRoutes);
  return app;
}

describe("GET /schema (versioned + cacheable)", () => {
  test("returns the schema with version, ETag and long public cache headers", async () => {
    const res = await request(buildApp()).get("/schema");

    expect(res.status).toBe(200);
    expect(res.body.version).toMatch(/^[0-9a-f]{12}$/);
    expect(res.body.version).toBe(getPropertySchemaVersion());
    expect(res.headers.etag).toBe(`"${res.body.version}"`);
    expect(res.headers["cache-control"]).toContain("public");
    expect(res.headers["cache-control"]).toContain("max-age=3600");
  });

  test("returns 304 when If-None-Match matches the ETag", async () => {
    const app = buildApp();
    const first = await request(app).get("/schema");
    const res = await request(app).get("/schema").set("If-None-Match", first.headers.etag);

    expect(res.status).toBe(304);
  });
});

describe("GET /schema/version (lightweight poll endpoint)", () => {
  test("returns only the version with short public cache headers", async () => {
    const res = await request(buildApp()).get("/schema/version");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({version: getPropertySchemaVersion()});
    expect(res.headers.etag).toBe(`"${res.body.version}"`);
    expect(res.headers["cache-control"]).toContain("public");
    expect(res.headers["cache-control"]).toContain("max-age=60");
  });

  test("version matches the full schema version and supports 304", async () => {
    const app = buildApp();
    const full = await request(app).get("/schema");
    const light = await request(app).get("/schema/version");

    expect(light.body.version).toBe(full.body.version);

    const res = await request(app)
        .get("/schema/version")
        .set("If-None-Match", light.headers.etag);
    expect(res.status).toBe(304);
  });
});
