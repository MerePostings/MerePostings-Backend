jest.mock("../db");
jest.mock("firebase-functions/logger", () => ({error: jest.fn(), warn: jest.fn()}));
jest.mock("firebase-admin/firestore", () => ({FieldValue: {serverTimestamp: () => "SERVER_TIME"}}));

const {db, resetDbMock, __refs} = require("../db");
const {queueSmartConnectionsContact, handleOutboxEntry} = require("../smartConnections");

const ENTRY = {event: "SIGN_UP", email: "jane@example.com", firstName: "Jane", lastName: "Doe", phone: "", details: ""};

const outboxEvent = (time = new Date().toISOString()) => {
  const ref = {update: jest.fn()};
  return {event: {data: {ref, data: () => ENTRY}, params: {id: "delivery-1"}, time}, ref};
};

const respond = (status, body = {}) =>
  jest.fn().mockResolvedValue({ok: status >= 200 && status < 300, status, json: async () => body});

describe("smartConnections", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetDbMock();
    process.env.SMART_CONNECTIONS_URL = "https://example.test/websiteContact";
    process.env.SMART_CONNECTIONS_API_KEY = "test-key";
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete process.env.SMART_CONNECTIONS_URL;
    delete process.env.SMART_CONNECTIONS_API_KEY;
  });

  describe("queueSmartConnectionsContact", () => {
    it("writes a trimmed outbox entry", async () => {
      __refs.collectionRef.add.mockResolvedValue({id: "x"});
      await queueSmartConnectionsContact({event: "MESSAGE", email: " jane@example.com ", firstName: "Jane", details: "Hi"});

      expect(db.collection).toHaveBeenCalledWith("smartConnectionsOutbox");
      expect(__refs.collectionRef.add).toHaveBeenCalledWith({
        event: "MESSAGE",
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "",
        phone: "",
        details: "Hi",
        createdAt: "SERVER_TIME",
      });
    });

    it("never throws, so the user's request still succeeds", async () => {
      __refs.collectionRef.add.mockRejectedValue(new Error("Firestore down"));
      await expect(queueSmartConnectionsContact(ENTRY)).resolves.toBeUndefined();
    });

    it("keeps the payment of PAYMENT and REFUND entries", async () => {
      __refs.collectionRef.add.mockResolvedValue({id: "x"});
      const payment = {id: "pi_1", description: "Listing fee", amount: 50000, paidAt: "2026-11-12T15:00:00.000Z"};
      await queueSmartConnectionsContact({event: "PAYMENT", email: "jane@example.com", payment});

      expect(__refs.collectionRef.add).toHaveBeenCalledWith(expect.objectContaining({event: "PAYMENT", payment}));
    });

    it("skips payment events without a payment, and other events with one", async () => {
      await queueSmartConnectionsContact({...ENTRY, event: "PAYMENT"});
      await queueSmartConnectionsContact({...ENTRY, payment: {id: "pi_1"}});
      expect(__refs.collectionRef.add).not.toHaveBeenCalled();
    });

    it("skips entries without an email or a known event", async () => {
      await queueSmartConnectionsContact({...ENTRY, email: " "});
      await queueSmartConnectionsContact({...ENTRY, event: "PARTY"});
      expect(__refs.collectionRef.add).not.toHaveBeenCalled();
    });
  });

  describe("handleOutboxEntry", () => {
    it("sends the entry with the site's key and records the contact", async () => {
      global.fetch = respond(200, {contactId: "c1", created: true});
      const {event, ref} = outboxEvent();
      await handleOutboxEntry(event);

      const [url, request] = global.fetch.mock.calls[0];
      expect(url).toBe("https://example.test/websiteContact");
      expect(request.headers.Authorization).toBe("Bearer test-key");
      expect(JSON.parse(request.body)).toEqual({deliveryId: "delivery-1", ...ENTRY});
      expect(ref.update).toHaveBeenCalledWith({deliveredAt: "SERVER_TIME", contactId: "c1"});
    });

    it("throws on server and network errors so Firebase retries", async () => {
      global.fetch = respond(503);
      await expect(handleOutboxEntry(outboxEvent().event)).rejects.toThrow("Smart Connections answered 503");

      global.fetch = jest.fn().mockRejectedValue(new Error("ECONNRESET"));
      await expect(handleOutboxEntry(outboxEvent().event)).rejects.toThrow("ECONNRESET");
    });

    it("records rejected data instead of retrying it", async () => {
      global.fetch = respond(400, {error: "Invalid input.", issues: [{path: "email", message: "Enter a valid email address"}]});
      const {event, ref} = outboxEvent();
      await expect(handleOutboxEntry(event)).resolves.toBeUndefined();
      expect(ref.update).toHaveBeenCalledWith({failedAt: "SERVER_TIME", error: expect.stringContaining("email")});
    });

    it("gives up on entries older than a day", async () => {
      global.fetch = jest.fn();
      const {event, ref} = outboxEvent(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString());
      await handleOutboxEntry(event);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(ref.update).toHaveBeenCalledWith(expect.objectContaining({failedAt: "SERVER_TIME"}));
    });

    it("leaves entries alone when Smart Connections isn't configured", async () => {
      delete process.env.SMART_CONNECTIONS_URL;
      global.fetch = jest.fn();
      const {event, ref} = outboxEvent();
      await handleOutboxEntry(event);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(ref.update).toHaveBeenCalledWith(expect.objectContaining({skippedAt: "SERVER_TIME"}));
    });
  });
});
