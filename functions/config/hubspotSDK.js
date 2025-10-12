require('dotenv').config({ path: '.env' });
const hubspot = require('@hubspot/api-client');
const OBJECTS_LIMIT = 100;

const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});


const findContactByEmail = async (email) => {
  try {
    const filter = {
      propertyName: 'email',
      operator: 'EQ',
      value: email,
    };

    const filterGroup = { filters: [filter] };

    const publicObjectSearchRequest = {
      filterGroups: [filterGroup],
      properties: ['email'],
      limit: 1,
    };

    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch(publicObjectSearchRequest);
    const results = searchResponse?.results;

    if (results && results.length > 0) {
      return results[0]; 
    }

    return null;
  } catch (error) {
    console.log(error)
    return null;
  }
};


const createContactIfNotExists = async (properties) => {
  const email = properties.email;
  if (!email) throw new Error('Email is required to check for duplicates.');

  const existingContact = await findContactByEmail(email);
  if (existingContact) {
    console.log('Contact already exists with ID:', existingContact.id);
    return existingContact.id;
  }

const response = await hubspotClient.crm.contacts.basicApi.create({ properties });
return response.id;
};

module.exports= {createContactIfNotExists}