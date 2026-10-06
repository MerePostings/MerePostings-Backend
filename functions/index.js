require("dotenv").config();
require("dotenv").config({path: `.env.${process.env.NODE_ENV}`});
const app = require("./app");
const {onRequest} = require("firebase-functions/v2/https");

const isProduction = process.env.NODE_ENV === "production";

exports.api = onRequest(
    {
      region: "us-central1",
      timeoutSeconds: 540,
      ...(isProduction && {
        memory: "2GiB",
        cpu: 2,
        minInstances: 1,
      }),
    },
    app,
);