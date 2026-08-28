const validateDraftField = require("../validateDraftField");

function mockReqRes(body) {
  const req = {body};
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

describe("validateDraftField", () => {
  test("attaches req.validatedField on a valid known field", () => {
    const {req, res, next} = mockReqRes({
      propertyType: "detached",
      fieldName: "bedroomsAboveGrade",
      fieldValue: 4,
    });

    validateDraftField(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validatedField).toEqual({
      propertyType: "detached",
      fieldName: "bedroomsAboveGrade",
      fieldValue: 4,
      path: "interior",
      dbKey: "bedroomsAboveGrade",
    });
  });

  test("400s on an invalid envelope (bad propertyType)", () => {
    const {req, res, next} = mockReqRes({
      propertyType: "not-a-type",
      fieldName: "bedroomsAboveGrade",
      fieldValue: 4,
    });

    validateDraftField(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  test("400s on a field that doesn't exist for the property type", () => {
    const {req, res, next} = mockReqRes({
      propertyType: "detached",
      fieldName: "totallyMadeUp",
      fieldValue: 4,
    });

    validateDraftField(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].field).toBe("totallyMadeUp");
  });

  test("400s on a value that fails the field's own schema", () => {
    const {req, res, next} = mockReqRes({
      propertyType: "detached",
      fieldName: "bedroomsAboveGrade",
      fieldValue: 999,
    });

    validateDraftField(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].field).toBe("bedroomsAboveGrade");
  });
});
