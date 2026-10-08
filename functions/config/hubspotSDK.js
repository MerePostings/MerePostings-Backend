require("dotenv").config({path: ".env"});
const logger = require("firebase-functions/logger");
const hubspot = require("@hubspot/api-client");

const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

const NOTE_TO_CONTACT_ASSOCIATION = 202;

const compactProperties = (properties) =>
  Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value != null && String(value).trim() !== ""),
  );

const isRejectedAffiliation = (error, properties) =>
  error?.code === 400 &&
  properties.platform_affiliation &&
  JSON.stringify(error.body || "").includes("INVALID_OPTION");

const existingIdFromConflict = (error) => {
  if (error?.code !== 409) return null;
  const text = typeof error.body === "string" ?
    error.body :
    JSON.stringify(error.body || error.message || "");
  const match = text.match(/Existing ID:\s*(\d+)/i);
  return match ? match[1] : null;
};


const findContactByEmail = async (email) => {
  try {
    const filter = {
      propertyName: "email",
      operator: "EQ",
      value: email,
    };

    const filterGroup = {filters: [filter]};

    const publicObjectSearchRequest = {
      filterGroups: [filterGroup],
      properties: ["email"],
      limit: 1,
    };

    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch(publicObjectSearchRequest);
    const results = searchResponse?.results;

    if (results && results.length > 0) {
      return results[0];
    }

    return null;
  } catch (error) {
    logger.error(error);
    return null;
  }
};

const writeContact = async (existingId, properties) => {
  try {
    if (existingId) {
      const rest = {...properties};
      delete rest.email;
      await hubspotClient.crm.contacts.basicApi.update(existingId, {properties: rest});
      return existingId;
    }
    const response = await hubspotClient.crm.contacts.basicApi.create({properties});
    return response.id;
  } catch (error) {
    const conflictId = !existingId && existingIdFromConflict(error);
    if (conflictId) {
      logger.info("HubSpot contact already exists; updating", conflictId);
      return writeContact(conflictId, properties);
    }
    if (!isRejectedAffiliation(error, properties)) throw error;

    logger.error(
        "HubSpot rejected platform_affiliation; retrying without it",
        error,
    );
    const rest = {...properties};
    delete rest.platform_affiliation;
    return writeContact(existingId, rest);
  }
};

const upsertContact = async (properties) => {
  const email = properties.email;
  if (!email) throw new Error("Email is required to check for duplicates.");

  const payload = compactProperties(properties);
  const existingContact = await findContactByEmail(email);
  if (existingContact) {
    logger.info("Updating existing HubSpot contact:", existingContact.id);
    return writeContact(existingContact.id, payload);
  }

  return writeContact(null, payload);
};

const createContactIfNotExists = async (properties) => upsertContact(properties);

const addContactNote = async (contactId, body) => {
  if (!contactId || !body) return;

  await hubspotClient.crm.objects.notes.basicApi.create({
    properties: {
      hs_timestamp: Date.now().toString(),
      hs_note_body: body,
    },
    associations: [
      {
        to: {id: String(contactId)},
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: NOTE_TO_CONTACT_ASSOCIATION,
          },
        ],
      },
    ],
  });
};

const recordContactInquiry = async ({email, firstname, lastname, phone, noteBody}) => {
  if (!email) return null;

  const contactId = await upsertContact({
    email,
    firstname,
    lastname,
    phone,
    platform_affiliation: "Mere Postings",
  });

  if (noteBody) {
    await addContactNote(contactId, noteBody);
  }

  return contactId;
};

module.exports = {
  createContactIfNotExists,
  upsertContact,
  addContactNote,
  recordContactInquiry,
};
