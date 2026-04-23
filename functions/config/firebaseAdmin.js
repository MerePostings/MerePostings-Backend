const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(process.env.SIGNATURE),
    storageBucket: process.env.STORAGEBUCKET,
  });
}

module.exports = admin;