const admin = require("./firebaseAdmin");

const db = admin.firestore();
const storage = admin.storage().bucket();

module.exports = {db, storage};
