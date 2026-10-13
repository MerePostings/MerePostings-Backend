jest.mock("../../config/db");
jest.mock("../mailService", () => ({sendVerificationEmail: jest.fn()}));
jest.mock("../../config/hubspotSDK", () => ({createContactIfNotExists: jest.fn()}));
jest.mock("firebase-functions/logger", () => ({error: jest.fn()}));

const mockAuth = {
  getUser: jest.fn(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  generateEmailVerificationLink: jest.fn(),
};
jest.mock("../../config/firebaseAdmin", () => ({auth: () => mockAuth}));

const {FieldValue} = require("firebase-admin/firestore");
const {__refs: {docRef, tx}, resetDbMock} = require("../../config/db");
const {sendVerificationEmail} = require("../mailService");
const AppError = require("../../utils/AppError");
const authService = require("../authService");

const FIREBASE_LINK =
  "https://mere-postings-auei.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=code1&apiKey=key&lang=en";
const SITE_LINK = "http://localhost:3000/email-verified?mode=verifyEmail&oobCode=code1&apiKey=key&lang=en";

const sentSecondsAgo = (seconds) => ({toMillis: () => Date.now() - seconds * 1000});
const userDoc = (data) => ({exists: true, data: () => data});

beforeEach(() => {
  resetDbMock();
  Object.values(mockAuth).forEach((fn) => fn.mockReset());
  sendVerificationEmail.mockReset();
  mockAuth.generateEmailVerificationLink.mockResolvedValue(FIREBASE_LINK);
  docRef.update.mockResolvedValue();
});

describe("authService.resendVerificationEmail", () => {
  beforeEach(() => {
    mockAuth.getUser.mockResolvedValue({uid: "u1", email: "ann@example.com", displayName: "Ann Lee", emailVerified: false});
  });

  it("returns already_verified without sending or touching the cooldown", async () => {
    mockAuth.getUser.mockResolvedValue({uid: "u1", email: "ann@example.com", emailVerified: true});

    await expect(authService.resendVerificationEmail("u1")).resolves.toEqual({status: "already_verified"});
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(tx.get).not.toHaveBeenCalled();
  });

  it("emails the user's own address a link to our /email-verified page and starts the cooldown", async () => {
    tx.get.mockResolvedValue(userDoc({}));

    await expect(authService.resendVerificationEmail("u1")).resolves.toEqual({status: "sent", retryAfterSeconds: 60});

    expect(mockAuth.generateEmailVerificationLink).toHaveBeenCalledWith("ann@example.com");
    expect(sendVerificationEmail).toHaveBeenCalledWith("ann@example.com", SITE_LINK, "Ann");
    expect(tx.set).toHaveBeenCalledWith(
        docRef,
        expect.objectContaining({lastVerificationEmailAt: expect.anything()}),
        {merge: true},
    );
  });

  it("429s with retryAfterSeconds inside the 60s cooldown", async () => {
    tx.get.mockResolvedValue(userDoc({lastVerificationEmailAt: sentSecondsAgo(10)}));

    const error = await authService.resendVerificationEmail("u1").catch((e) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(429);
    expect(error.details).toEqual({code: "VERIFICATION_EMAIL_COOLDOWN", retryAfterSeconds: 50});
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("sends again once the cooldown has passed", async () => {
    tx.get.mockResolvedValue(userDoc({lastVerificationEmailAt: sentSecondsAgo(61)}));

    await expect(authService.resendVerificationEmail("u1")).resolves.toEqual({status: "sent", retryAfterSeconds: 60});
    expect(sendVerificationEmail).toHaveBeenCalled();
  });

  it("hands the cooldown back and rethrows the mail error when Postmark rejects", async () => {
    const previous = sentSecondsAgo(120);
    tx.get.mockResolvedValue(userDoc({lastVerificationEmailAt: previous}));
    sendVerificationEmail.mockRejectedValue(new AppError("inactive recipient", 422));

    await expect(authService.resendVerificationEmail("u1")).rejects.toMatchObject({statusCode: 422});
    expect(docRef.update).toHaveBeenCalledWith({lastVerificationEmailAt: previous});
  });

  it("502s and clears the cooldown when the link can't be generated", async () => {
    tx.get.mockResolvedValue({exists: false});
    mockAuth.generateEmailVerificationLink.mockRejectedValue(
        Object.assign(new Error("quota"), {code: "auth/internal-error"}),
    );

    await expect(authService.resendVerificationEmail("u1")).rejects.toMatchObject({statusCode: 502});
    expect(docRef.update).toHaveBeenCalledWith({lastVerificationEmailAt: FieldValue.delete()});
  });
});

describe("authService.signUp verification email", () => {
  const input = {
    firstName: "Ann",
    lastName: "Lee",
    email: "ann@example.com",
    password: "Passw0rd!",
    termsAccepted: true,
  };

  beforeEach(() => {
    mockAuth.getUserByEmail.mockRejectedValue(Object.assign(new Error("none"), {code: "auth/user-not-found"}));
    mockAuth.createUser.mockResolvedValue({uid: "u1"});
    docRef.set.mockResolvedValue();
  });

  it("sends the site link and records the send time for the cooldown", async () => {
    await authService.signUp(input);

    expect(sendVerificationEmail).toHaveBeenCalledWith("ann@example.com", SITE_LINK, "Ann");
    expect(docRef.update).toHaveBeenCalledWith({lastVerificationEmailAt: expect.anything()});
  });

  it("still signs up when the email fails, without starting the cooldown", async () => {
    sendVerificationEmail.mockRejectedValue(new AppError("down", 502));

    await expect(authService.signUp(input)).resolves.toBeUndefined();
    expect(docRef.update).not.toHaveBeenCalled();
  });
});
