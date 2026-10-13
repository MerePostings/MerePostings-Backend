require("dotenv").config();
require("dotenv").config({path: `.env.${process.env.NODE_ENV}`});
const app = require("./app");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

// Read from Secret Manager and exposed to the app as process.env.POSTMARK_SERVER_TOKEN.
// Locally, put it in functions/.secret.local; it must not also be in a .env file.
const postmarkServerToken = defineSecret("POSTMARK_SERVER_TOKEN");

const isProduction = process.env.NODE_ENV === "production";

exports.api = onRequest(
    {
      region: "us-central1",
      timeoutSeconds: 540,
      secrets: [postmarkServerToken],
      ...(isProduction && {
        memory: "2GiB",
        cpu: 2,
        minInstances: 1,
      }),
    },
    app,
);
