require("dotenv").config()
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
const app = require("./app");
const functions = require("firebase-functions");
exports.api = functions.https.onRequest(app);
