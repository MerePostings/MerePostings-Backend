const mockSendEmail = jest.fn();

jest.mock("postmark", () => ({
  ServerClient: jest.fn(() => ({sendEmail: mockSendEmail})),
}));
jest.mock("firebase-functions/logger", () => ({error: jest.fn()}));
// The real module loads .env on require, which would re-set
// POSTMARK_MESSAGE_STREAM inside isolateModules.
jest.mock("../../config/hubspotSDK", () => ({createContactIfNotExists: jest.fn()}));

const logger = require("firebase-functions/logger");

const loadMailService = () => {
  let mailService;
  jest.isolateModules(() => {
    mailService = require("../mailService");
  });
  return mailService;
};

describe("mailService", () => {
  const originalStream = process.env.POSTMARK_MESSAGE_STREAM;

  beforeEach(() => {
    mockSendEmail.mockReset();
    delete process.env.POSTMARK_MESSAGE_STREAM;
  });

  afterAll(() => {
    if (originalStream === undefined) delete process.env.POSTMARK_MESSAGE_STREAM;
    else process.env.POSTMARK_MESSAGE_STREAM = originalStream;
  });

  it("sends on the default 'outbound' stream", async () => {
    mockSendEmail.mockResolvedValue({});
    const {sendNotificationEmail} = loadMailService();

    await sendNotificationEmail("a@b.com", "Hi", "<p>x</p>");

    expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({To: "a@b.com", MessageStream: "outbound"}),
    );
  });

  it("uses POSTMARK_MESSAGE_STREAM when set", async () => {
    process.env.POSTMARK_MESSAGE_STREAM = "custom-stream";
    mockSendEmail.mockResolvedValue({});
    const {contactMessage} = loadMailService();

    await contactMessage("Name", "a@b.com", "hello");

    expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({MessageStream: "custom-stream"}),
    );
  });

  it("logs instead of rejecting when a best-effort send fails", async () => {
    mockSendEmail.mockRejectedValue(
        Object.assign(new Error("stream does not exist"), {code: 1235}),
    );
    const {sendVerificationEmail} = loadMailService();

    await expect(
        sendVerificationEmail("a@b.com", "https://link", "Ann"),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
        "[mail] Postmark send failed",
        expect.objectContaining({code: 1235}),
    );
  });

  it("still rejects from sendNotificationEmail so its caller can log it", async () => {
    mockSendEmail.mockRejectedValue(new Error("boom"));
    const {sendNotificationEmail} = loadMailService();

    await expect(
        sendNotificationEmail("a@b.com", "Hi", "<p>x</p>"),
    ).rejects.toThrow("boom");
  });
});
