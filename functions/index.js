require("dotenv").config();
require("dotenv").config({path: `.env.${process.env.NODE_ENV}`});
const app = require("./app");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {handleOutboxEntry} = require("./config/smartConnections");

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

// Sends each queued sign-up or inquiry to Smart Connections; a thrown error
// makes Firebase retry it (see config/smartConnections.js).
exports.deliverToSmartConnections = onDocumentCreated(
    {document: "smartConnectionsOutbox/{id}", region: "us-central1", retry: true},
    handleOutboxEntry,
);
