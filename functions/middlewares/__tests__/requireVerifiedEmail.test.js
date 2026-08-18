const requireVerifiedEmail = require("../requireVerifiedEmail");

function buildReqRes(user) {
  const req = {user};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return {req, res, next};
}

describe("requireVerifiedEmail", () => {
  test("calls next() when req.user.email_verified is true", () => {
    const {req, res, next} = buildReqRes({uid: "user-123", email_verified: true});

    requireVerifiedEmail(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("403s when req.user.email_verified is false", () => {
    const {req, res, next} = buildReqRes({uid: "user-123", email_verified: false});

    requireVerifiedEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Please verify your email address to continue.",
      code: "EMAIL_NOT_VERIFIED",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("403s when req.user has no email_verified claim at all", () => {
    const {req, res, next} = buildReqRes({uid: "user-123"});

    requireVerifiedEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("403s when req.user is missing entirely", () => {
    const {req, res, next} = buildReqRes(undefined);

    requireVerifiedEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
