const {z} = require("zod");
const validate = require("../validate");

function mockReqRes(body, query = {}) {
  const req = {body, query};
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  const next = jest.fn();
  return {req, res, next};
}

describe("validate middleware — body", () => {
  const schema = z.object({name: z.string().min(1)});

  test("calls next() and replaces req.body with the parsed value on success", () => {
    const {req, res, next} = mockReqRes({name: "Jane", extra: "stripped"});
    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({name: "Jane"}); // unknown keys stripped, matching old stripUnknown:true
    expect(res.statusCode).toBeNull();
  });

  test("responds 400 with a field-by-field error list on failure", () => {
    const {req, res, next} = mockReqRes({name: ""});
    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0]).toEqual(expect.objectContaining({field: "name"}));
  });
});

describe("validate middleware — query coercion", () => {
  const schema = z.object({limit: z.coerce.number().int().min(1).max(100).optional()});

  test("coerces a query-string number and swaps req.query", () => {
    const {req, res, next} = mockReqRes({}, {limit: "25"});
    validate(schema, "query")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.limit).toBe(25);
  });

  test("rejects an out-of-range coerced query value", () => {
    const {req, res, next} = mockReqRes({}, {limit: "500"});
    validate(schema, "query")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});
