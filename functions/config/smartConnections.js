const logger = require("firebase-functions/logger");
const {FieldValue} = require("firebase-admin/firestore");
const {db} = require("./db");

// Sign-ups and inquiries waiting to be sent to Smart Connections, the
// brokerage's contact list. deliverToSmartConnections (index.js) sends each
// one and retries until it gets through, so a Smart Connections outage never
// loses a lead or slows down the request that created it.
const OUTBOX = "smartConnectionsOutbox";
const TIMEOUT_MS = 10 * 1000;
// Firebase retries a failing trigger with backoff; past this age we stop.
const GIVE_UP_AFTER_MS = 24 * 60 * 60 * 1000;

const EVENTS = new Set(["SIGN_UP", "MESSAGE", "CALLBACK", "MEETING"]);

const trimmed = (value) => (value == null ? "" : String(value).trim());

/**
 * Queues a contact for Smart Connections. Never throws: the user's request has
 * already succeeded, so a failed write is logged instead.
 * @param {{event: string, email: string, firstName?: string, lastName?: string,
 *   phone?: string, details?: string}} contact
 */
const queueSmartConnectionsContact = async ({event, email, firstName, lastName, phone, details}) => {
  if (!EVENTS.has(event) || !trimmed(email)) return;
  try {
    await db.collection(OUTBOX).add({
      event,
      email: trimmed(email),
      firstName: trimmed(firstName),
      lastName: trimmed(lastName),
      phone: trimmed(phone),
      details: trimmed(details),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error("[smartConnections] Couldn't queue contact", {event, message: error.message});
  }
};

/**
 * Sends one queued contact. Resolves with what to record on the outbox entry;
 * throws when the send should be retried (network errors, 401, 5xx).
 */
const deliverOutboxEntry = async (id, entry) => {
  const url = process.env.SMART_CONNECTIONS_URL;
  const key = process.env.SMART_CONNECTIONS_API_KEY;
  if (!url || !key) return {skippedAt: FieldValue.serverTimestamp(), error: "Smart Connections isn't configured"};

  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": `Bearer ${key}`},
    body: JSON.stringify({
      deliveryId: id,
      event: entry.event,
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      phone: entry.phone,
      details: entry.details,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));

  if (response.ok) return {deliveredAt: FieldValue.serverTimestamp(), contactId: body.contactId};
  // Retrying the same bad data won't help.
  if (response.status === 400) {
    return {failedAt: FieldValue.serverTimestamp(), error: JSON.stringify(body.issues || body.error || "Invalid input")};
  }
  throw new Error(`Smart Connections answered ${response.status}`);
};

/**
 * The deliverToSmartConnections trigger: sends a new outbox entry and records
 * the outcome on it. Rethrows retryable failures so Firebase tries again.
 * @param {import("firebase-functions/v2/firestore").FirestoreEvent<
 *   import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined>} event
 */
const handleOutboxEntry = async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const id = event.params.id;

  if (Date.now() - Date.parse(event.time) > GIVE_UP_AFTER_MS) {
    logger.error("[smartConnections] Gave up delivering contact", {id});
    await snapshot.ref.update({failedAt: FieldValue.serverTimestamp(), error: "Gave up after 24 hours of retries"});
    return;
  }

  try {
    const outcome = await deliverOutboxEntry(id, snapshot.data());
    if (outcome.error) logger.error("[smartConnections] Contact not delivered", {id, error: outcome.error});
    await snapshot.ref.update(outcome);
  } catch (error) {
    logger.warn("[smartConnections] Delivery failed; will retry", {id, message: error.message});
    throw error;
  }
};

module.exports = {queueSmartConnectionsContact, deliverOutboxEntry, handleOutboxEntry, OUTBOX};
