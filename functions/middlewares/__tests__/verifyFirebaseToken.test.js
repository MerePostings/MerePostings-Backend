// Jest auto-applies config/__mocks__/firebaseAdmin.js once jest.mock() names the module.
jest.mock("../../config/firebaseAdmin");

const {__refs} = require("../../config/firebaseAdmin");
const verifyFirebaseToken = require("../verifyFirebaseToken");

function buildReqRes(headers = {}) {
  const req = {headers};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return {req, res, next};
}

describe("verifyFirebaseToken", () => {
  test("401s with no Authorization header", async () => {
    const {req, res, next} = buildReqRes({});

    await verifyFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({error: "No token provided"});
    expect(next).not.toHaveBeenCalled();
  });

  test("401s when the header isn't Bearer-prefixed", async () => {
    const {req, res, next} = buildReqRes({authorization: "Basic xyz"});

    await verifyFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("sets req.user and calls next() on a valid token", async () => {
    const decodedToken = {uid: "user-123", email: "user@example.com"};
    __refs.verifyIdToken.mockResolvedValueOnce(decodedToken);
    const {req, res, next} = buildReqRes({authorization: "Bearer valid-token"});

    await verifyFirebaseToken(req, res, next);

    expect(__refs.verifyIdToken).toHaveBeenCalledWith("valid-token");
    expect(req.user).toEqual(decodedToken);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("401s when verifyIdToken rejects", async () => {
    __refs.verifyIdToken.mockRejectedValueOnce(new Error("invalid token"));
    const {req, res, next} = buildReqRes({authorization: "Bearer bad-token"});

    await verifyFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({error: "Unauthorized"});
    expect(next).not.toHaveBeenCalled();
  });
});
