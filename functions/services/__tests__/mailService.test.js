const mockSendEmail = jest.fn();
const mockQueueContact = jest.fn();

jest.mock("postmark", () => ({
  ServerClient: jest.fn(() => ({sendEmail: mockSendEmail})),
}));
jest.mock("firebase-functions/logger", () => ({error: jest.fn()}));
jest.mock("../../config/smartConnections", () => ({
  queueSmartConnectionsContact: (...args) => mockQueueContact(...args),
}));

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
    mockQueueContact.mockReset();
    mockQueueContact.mockResolvedValue(undefined);
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
    const {sendNotificationEmail} = loadMailService();

    await sendNotificationEmail("a@b.com", "Hi", "<p>x</p>");

    expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({MessageStream: "custom-stream"}),
    );
  });

  it("emails the Contact us inquiry to support and queues it for Smart Connections", async () => {
    mockSendEmail.mockResolvedValue({});
    const {contactInquiry} = loadMailService();

    await contactInquiry({
      name: "Jane Smith",
      email: "jane@example.com",
      topic: "My listing",
      message: "Can I change my photos? <b>now</b>",
    });

    const sent = mockSendEmail.mock.calls[0][0];
    expect(sent.To).toBe("support@merepostings.com");
    expect(sent.Subject).toBe("New Contact us inquiry from Jane Smith — My listing");
    expect(sent.HtmlBody).toContain("jane@example.com");
    expect(sent.HtmlBody).toContain("Can I change my photos? &lt;b&gt;now&lt;/b&gt;");
    expect(sent.HtmlBody).not.toMatch(/undefined/i);

    expect(mockQueueContact).toHaveBeenCalledWith({
      event: "INQUIRY",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Smith",
      inquiry: {topic: "My listing", message: "Can I change my photos? <b>now</b>"},
    });
  });

  it("logs instead of rejecting when a best-effort send fails, and still records the inquiry", async () => {
    mockSendEmail.mockRejectedValue(
        Object.assign(new Error("stream does not exist"), {code: 1235}),
    );
    const {contactInquiry} = loadMailService();

    await expect(
        contactInquiry({name: "Ann", email: "a@b.com", topic: "Other", message: "Hi"}),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
        "[mail] Postmark send failed",
        expect.objectContaining({code: 1235}),
    );
    expect(mockQueueContact).toHaveBeenCalledWith(expect.objectContaining({event: "INQUIRY", firstName: "Ann"}));
  });

  describe("sendVerificationEmail", () => {
    const LINK = "https://merepostings.com/email-verified?mode=verifyEmail&oobCode=abc&apiKey=k&lang=en";

    it("sends from Smart Hub with link tracking off, a tag, and a text fallback", async () => {
      mockSendEmail.mockResolvedValue({});
      const {sendVerificationEmail} = loadMailService();

      await sendVerificationEmail("ann@example.com", LINK, "Ann");

      const message = mockSendEmail.mock.calls[0][0];
      expect(message).toEqual(expect.objectContaining({
        From: "Smart Hub <noreply@merepostings.com>",
        To: "ann@example.com",
        MessageStream: "outbound",
        Tag: "email-verification",
        TrackLinks: "None",
        TrackOpens: false,
      }));
      expect(message.TextBody).toContain(LINK);
      expect(message.TextBody).toContain("Hi Ann,");
      // The & in the query string is HTML-escaped inside href attributes.
      expect(message.HtmlBody).toContain(`href="${LINK.replace(/&/g, "&amp;")}"`);
    });

    it("escapes the user's name in the HTML and falls back when it's missing", async () => {
      mockSendEmail.mockResolvedValue({});
      const {sendVerificationEmail} = loadMailService();

      await sendVerificationEmail("a@b.com", LINK, "<b>Ann</b>");
      expect(mockSendEmail.mock.calls[0][0].HtmlBody).toContain("Hi &lt;b&gt;Ann&lt;/b&gt;,");

      await sendVerificationEmail("a@b.com", LINK, undefined);
      expect(mockSendEmail.mock.calls[1][0].TextBody).toContain("Hi there,");
    });

    it.each([
      [406, 422, /bounced or were marked as spam/],
      [300, 422, /can't receive mail/],
      [400, 502, /try again in a few minutes/],
      [undefined, 502, /try again in a few minutes/],
    ])("turns Postmark error %s into a %s AppError and logs it", async (code, statusCode, message) => {
      mockSendEmail.mockRejectedValue(Object.assign(new Error("postmark says no"), {code, statusCode: 422}));
      const {sendVerificationEmail} = loadMailService();

      await expect(sendVerificationEmail("a@b.com", LINK, "Ann"))
          .rejects.toMatchObject({statusCode, isOperational: true, message: expect.stringMatching(message)});
      expect(logger.error).toHaveBeenCalledWith(
          "[mail] Verification email failed",
          expect.objectContaining({to: "a@b.com", code, message: "postmark says no"}),
      );
    });
  });

  it("still rejects from sendNotificationEmail so its caller can log it", async () => {
    mockSendEmail.mockRejectedValue(new Error("boom"));
    const {sendNotificationEmail} = loadMailService();

    await expect(
        sendNotificationEmail("a@b.com", "Hi", "<p>x</p>"),
    ).rejects.toThrow("boom");
  });
});
