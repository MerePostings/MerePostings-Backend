require("dotenv").config();
const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH),
    scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

module.exports = { google, calendar,calendarId:process.env.GOOGLE_CALENDAR_ID };