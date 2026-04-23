require("dotenv").config()
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
const app = require("./app");
const { onRequest } = require("firebase-functions/v2/https");

exports.api = onRequest(
    {
        memory: '2GiB',
        timeoutSeconds: 540,
        region: 'us-central1',
    },
    app
);