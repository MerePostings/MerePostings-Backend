require("dotenv").config({path: ".env"});
const logger = require("firebase-functions/logger");
const hubspot = require("@hubspot/api-client");

const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});


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


const createContactIfNotExists = async (properties) => {
  const email = properties.email;
  if (!email) throw new Error("Email is required to check for duplicates.");

  const existingContact = await findContactByEmail(email);
  if (existingContact) {
    logger.info("Contact already exists with ID:", existingContact.id);
    return existingContact.id;
  }

  try {
    const response = await hubspotClient.crm.contacts.basicApi.create({properties});
    return response.id;
  } catch (error) {
    const rejectedAffiliation = error?.code === 400 &&
      properties.platform_affiliation &&
      JSON.stringify(error.body || "").includes("INVALID_OPTION");
    if (!rejectedAffiliation) throw error;

    logger.error(
        "HubSpot rejected platform_affiliation; creating contact without it",
        error,
    );
    const rest = {...properties};
    delete rest.platform_affiliation;
    const response = await hubspotClient.crm.contacts.basicApi.create({properties: rest});
    return response.id;
  }
};

module.exports= {createContactIfNotExists};
