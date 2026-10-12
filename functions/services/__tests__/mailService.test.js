const mockSendEmail = jest.fn();
const mockRecordContactInquiry = jest.fn();

jest.mock("postmark", () => ({
  ServerClient: jest.fn(() => ({sendEmail: mockSendEmail})),
}));
jest.mock("firebase-functions/logger", () => ({error: jest.fn()}));
// The real module loads .env on require, which would re-set
// POSTMARK_MESSAGE_STREAM inside isolateModules.
jest.mock("../../config/hubspotSDK", () => ({
  recordContactInquiry: (...args) => mockRecordContactInquiry(...args),
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
    mockRecordContactInquiry.mockReset();
    mockRecordContactInquiry.mockResolvedValue("1");
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

  it("puts callback topic, time, phone, and notes in the email and HubSpot note", async () => {
    mockSendEmail.mockResolvedValue({});
    const {callbackRequest} = loadMailService();

    await callbackRequest({
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "416-555-0123",
      time: "This afternoon",
      topic: "My listing",
      notes: "MLS A1234567",
    });

    const html = mockSendEmail.mock.calls[0][0].HtmlBody;
    expect(html).toContain("Jane Smith");
    expect(html).toContain("jane@example.com");
    expect(html).toContain("416-555-0123");
    expect(html).toContain("This afternoon");
    expect(html).toContain("My listing");
    expect(html).toContain("MLS A1234567");
    expect(html).not.toMatch(/undefined/i);
    expect(html).not.toContain("[object Object]");

    expect(mockRecordContactInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jane@example.com",
          phone: "416-555-0123",
          noteBody: expect.stringContaining("Inquiry: callback"),
        }),
    );
    const noteBody = mockRecordContactInquiry.mock.calls[0][0].noteBody;
    expect(noteBody).toContain("Topic: My listing");
    expect(noteBody).toContain("Best time: This afternoon");
    expect(noteBody).toContain("Phone: 416-555-0123");
    expect(noteBody).toContain("Notes: MLS A1234567");
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
