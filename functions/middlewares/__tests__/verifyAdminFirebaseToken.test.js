jest.mock("../../config/firebaseAdmin");
jest.mock("../../config/db");

const {__refs: firebaseAdminRefs} = require("../../config/firebaseAdmin");
const {__refs: dbRefs, resetDbMock} = require("../../config/db");
const verifyAdminFirebaseToken = require("../verifyAdminFirebaseToken");

function buildReqRes(headers = {}) {
  const req = {headers};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return {req, res, next};
}

describe("verifyAdminFirebaseToken", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("401s with no token, and never queries Firestore", async () => {
    const {req, res, next} = buildReqRes({});

    await verifyAdminFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({error: "No token provided"});
    expect(dbRefs.collectionRef.doc).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("401s when the users/{uid} doc doesn't exist", async () => {
    firebaseAdminRefs.verifyIdToken.mockResolvedValueOnce({uid: "user-123"});
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});
    const {req, res, next} = buildReqRes({authorization: "Bearer valid-token"});

    await verifyAdminFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({error: "User not found"});
    expect(next).not.toHaveBeenCalled();
  });

  test("403s when ifAdmin is falsy", async () => {
    firebaseAdminRefs.verifyIdToken.mockResolvedValueOnce({uid: "user-123"});
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ifAdmin: false, email: "user@example.com"}),
    });
    const {req, res, next} = buildReqRes({authorization: "Bearer valid-token"});

    await verifyAdminFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({error: "Forbidden: Admins only"});
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next() and sets a merged req.user when ifAdmin is true", async () => {
    firebaseAdminRefs.verifyIdToken.mockResolvedValueOnce({uid: "admin-1"});
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ifAdmin: true, email: "admin@example.com"}),
    });
    const {req, res, next} = buildReqRes({authorization: "Bearer valid-token"});

    await verifyAdminFirebaseToken(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({uid: "admin-1", ifAdmin: true, email: "admin@example.com"});
    expect(res.status).not.toHaveBeenCalled();
  });

  test("401s when verifyIdToken throws", async () => {
    firebaseAdminRefs.verifyIdToken.mockRejectedValueOnce(new Error("invalid token"));
    const {req, res, next} = buildReqRes({authorization: "Bearer bad-token"});

    await verifyAdminFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({error: "Unauthorized"});
    expect(next).not.toHaveBeenCalled();
  });
});
