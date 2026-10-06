require("dotenv").config();
const {google} = require("googleapis");
const path = require("path");
const logger = require("firebase-functions/logger");

const impersonatedUser = process.env.GOOGLE_CALENDAR_IMPERSONATED_USER || process.env.GOOGLE_CALENDAR_ID;

logger.info("Google Calendar auth resolved", {
  impersonatedUser: JSON.stringify(impersonatedUser),
  impersonatedUserLength: impersonatedUser ? impersonatedUser.length : 0,
  calendarId: JSON.stringify(process.env.GOOGLE_CALENDAR_ID),
});

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "..", process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH),
  scopes: ["https://www.googleapis.com/auth/calendar"],
  clientOptions: {subject: impersonatedUser},
});

const calendar = google.calendar({version: "v3", auth});

module.exports = {google, calendar, calendarId: process.env.GOOGLE_CALENDAR_ID, impersonatedUser};
