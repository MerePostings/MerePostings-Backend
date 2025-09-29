require("dotenv").config()
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
const functions = require('firebase-functions');
const app = require('./app')
exports.api = functions.https.onRequest(app);