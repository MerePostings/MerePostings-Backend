const express = require("express");
const schemaController = require("../controllers/schemaController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");

router.get(
    "/property-fields",
    verifyFirebaseToken,
    schemaController.getPropertyFields,
);

module.exports = router;
