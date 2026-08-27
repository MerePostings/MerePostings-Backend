const logger = require("firebase-functions/logger");
const {getStepsForListing} = require("../data/progressTrackerSteps");
const {db, storage} = require("../config/db");
const AppError = require("../utils/AppError");
const {FieldValue} = require("firebase-admin/firestore");
const {ADDONS_BY_ID} = require("../data/addons");
const actionService = require("./actionService");
const notificationService = require("./notificationService");
const {vetPropertyTypeFields} = require("../utils/vetPropertyTypeFields");
const EDITABLE_STATUSES = new Set(["initiated", "draft"]);

const MEDIA_LIMITS = {
  photos: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    maxBytes: 15 * 1024 * 1024,
    maxFiles: 50,
  },
  attachments: {
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ],
    maxBytes: 20 * 1024 * 1024,
    maxFiles: 15,
  },
};

/** Throws 404/403 unless `uid` owns `listingId`. Skip entirely for admin-initiated calls. */
async function assertListingOwnership(listingId, uid) {
  const snap = await db.collection("properties").doc(listingId).get();
  if (!snap.exists) throw new AppError("Property not found", 404);
  if (snap.data().ownerId !== uid) throw new AppError("Unauthorized access to this property", 403);
}

function getSelectedAddons(prop) {
  if (Array.isArray(prop?.selectedAddons)) return prop.selectedAddons;
  return [];
}

const buildAddressName = (location) => {
  try {
    const parts = [
      location.streetNumber,
      location.streetName,
      location.abbreviation,
      location.streetDirection ?? null,
    ].filter(Boolean).join(" ");

    const unit = location.apartmentUnitNumber ?
            `Unit ${location.apartmentUnitNumber}` :
            null;

    const municipality = location.municipality ?? null;
    return [parts, unit, municipality].filter(Boolean).join(", ");
  } catch (e) {
    logger.error(e);
  }
};

const propertyService = {
  updateProperty: async (userId, listingId, fields) => {
    const docRef = db.collection("properties").doc(listingId);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new AppError("Property not found", 404);
    }

    const existing = snap.data();

    if (existing.ownerId !== userId) {
      throw new AppError("Unauthorized access to this property", 403);
    }

    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw new AppError("Cannot edit a listing that has already been submitted", 409);
    }

    const update = {updatedAt: FieldValue.serverTimestamp()};
    for (const [key, value] of Object.entries(fields)) {
      update[`fields.${key}`] = value;
    }

    if (existing.status === "initiated") {
      update.status = "draft";
    }

    try {
      await docRef.update(update);
    } catch (e) {
      logger.error("Error updating property fields:", e);
      throw new AppError("Failed to update property", 500);
    }

    return fields;
  },

  initiateProperty: async (userId, body = {}) => {
    const {occupancyType} = body || {};
    try {
      const propertyData = {
        ownerId: userId,
        status: "initiated",
        paid: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (occupancyType) propertyData.occupancyType = occupancyType;

      const listingRef = await db.collection("properties").add(propertyData);
      return listingRef.id;
    } catch (e) {
      logger.error("Error initiating property:", e);
      throw new AppError("Failed to initiate property", 500);
    }
  },

  markSubmitted: async (listingId) => {
    try {
      const docRef = db.collection("properties").doc(listingId);

      let data;
      try {
        const snap = await docRef.get();
        data = snap?.data?.();
      } catch (fetchErr) {
        logger.error("[vet] Failed to fetch listing before marking submitted:", fetchErr);
      }

      const update = {
        status: "submitted",
        paid: true,
        submittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (data) {
        const vetted = vetPropertyTypeFields(data.propertyType, data.propertyDetails, data.featuresUpgrades);
        update.propertyDetails = vetted.propertyDetails;
        update.featuresUpgrades = vetted.featuresUpgrades;
      }
      await docRef.update(update);

      try {
        if (data?.ownerId) {
          await notificationService.createNotification({
            userId: data.ownerId,
            type: "status_change",
            severity: "success",
            title: "Listing submitted",
            message: "Your listing has been submitted and is now being reviewed.",
            listingId,
            listingAddress: buildAddressName(data.location || {}),
            actionUrl: `${process.env.FRONTEND_URL}/account/my-listings/${listingId}`,
            actionLabel: "View Listing",
            sendEmail: false,
          });
        }
      } catch (notifyErr) {
        logger.error("[notif] Failed to notify owner of listing submission:", notifyErr);
      }

      try {
        await actionService.generateActionsForListing(listingId, data ?? (await docRef.get()).data());
      } catch (actionErr) {
        logger.error("[actions] Failed to generate actions for listing:", actionErr);
      }
    } catch (e) {
      logger.error("Error marking property submitted:", e);
    }
  },

  /**
     * Uploads photos or attachments to Firebase Storage for a given listing
     * - Validates mediaType is either 'photos' or 'attachments'
     * - Verifies the requester owns the listing (skipped for admin calls)
     * - Validates each file's mime type and size against MEDIA_LIMITS
     * - Uploads each file to Storage under listingId/mediaType/
     * - Generates a long-lived signed URL for each file
     * - Appends uploaded file metadata to the listing's media array in Firestore
     */
  uploadMedia: async (listingId, files, mediaType, {uid, isAdmin, category} = {}) => {
    if (!["photos", "attachments"].includes(mediaType)) {
      throw new AppError("Invalid media type", 400);
    }
    if (!files || files.length === 0) {
      throw new AppError("No files received", 400);
    }

    if (!isAdmin) {
      await assertListingOwnership(listingId, uid);
    }

    const limits = MEDIA_LIMITS[mediaType];
    if (files.length > limits.maxFiles) {
      throw new AppError(`You can upload at most ${limits.maxFiles} files at a time`, 400);
    }
    for (const file of files) {
      if (!limits.mimeTypes.includes(file.mimetype)) {
        throw new AppError(`"${file.originalname}" is not an accepted file type for ${mediaType}`, 400);
      }
      if (file.buffer.length > limits.maxBytes) {
        throw new AppError(`"${file.originalname}" is too large (max ${limits.maxBytes / (1024 * 1024)}MB)`, 400);
      }
    }

    const mediaUrls = [];

    try {
      for (const file of files) {
        const fileName = `${listingId}/${mediaType}/${Date.now()}-${file.originalname}`;

        const fileUpload = storage.file(fileName);

        await fileUpload.save(file.buffer, {
          metadata: {contentType: file.mimetype},
        });

        const [url] = await fileUpload.getSignedUrl({
          action: "read",
          expires: "03-01-2500",
        });

        mediaUrls.push({
          url,
          fileName: file.originalname,
          uploadedAt: new Date(),
          category: mediaType === "attachments" ? (category ?? null) : null,
        });
      }

      await db.collection("properties").doc(listingId).update({
        [`media.${mediaType}`]: FieldValue.arrayUnion(...mediaUrls),
        updatedAt: FieldValue.serverTimestamp(),
      });

      try {
        await actionService.completeUploadAction(listingId, mediaType);
      } catch (actionErr) {
        logger.error("[actions] Failed to auto-complete upload action:", actionErr);
      }
    } catch (firebaseErr) {
      throw new AppError(firebaseErr.message || "Failed to upload to Firebase", 500);
    }

    return mediaUrls;
  },

  removeMedia: async (listingId, mediaType, mediaUrl, {uid, isAdmin} = {}) => {
    if (!["photos", "attachments"].includes(mediaType)) {
      throw new AppError("Invalid media type", 400);
    }

    if (!isAdmin) {
      await assertListingOwnership(listingId, uid);
    }

    const docRef = db.collection("properties").doc(listingId);
    const snap = await docRef.get();

    if (!snap.exists) throw new AppError("Property not found", 404);

    const data = snap.data();
    const currentMedia = data?.media?.[mediaType] ?? [];
    const updatedMedia = currentMedia.filter((item) => item.url !== mediaUrl);

    await docRef.update({
      [`media.${mediaType}`]: updatedMedia,
      updatedAt: FieldValue.serverTimestamp(),
    });

    try {
      const urlObj = new URL(mediaUrl);
      const pathMatch = urlObj.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        await storage.file(filePath).delete();
      }
    } catch (e) {
      logger.error("Storage deletion failed (non-critical):", e.message);
    }
  },

  getListing: async (uid, id) => {
    try {
      const docRef = db.collection("properties").doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new AppError("Property not found", 404);
      }

      const data = docSnap.data();

      if (data.ownerId !== uid) {
        throw new AppError("Unauthorized access to this property", 403);
      }

      let amountPaid;

      try {
        const snapshot = await db
            .collection("transactions")
            .where("listingId", "==", id)
            .orderBy("createdAt", "desc")
            .get();


        amountPaid = snapshot.docs[0].data().amount || 400;
      } catch (e) {
        amountPaid = 0;
      }


      return {
        id: docSnap.id,
        ...data,
        amountPaid,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    } catch (e) {
      logger.error("Error in getListing:", e);
      throw new AppError(`Failed to fetch listing: ${e.message}`, 500);
    }
  },

  getOwnerProperties: async (uid) => {
    try {
      const snapshot = await db
          .collection("properties")
          .where("ownerId", "==", uid)
          .orderBy("updatedAt", "desc")
          .get();

      const properties = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
      }));

      return properties;
    } catch (e) {
      logger.error("Error in getOwnerProperty:", e);
      throw new AppError(`Failed to fetch owner properties: ${e.message}`, 500);
    }
  },

  reorderMedia: async (listingId, mediaType, urls, {uid, isAdmin} = {}) => {
    try {
      if (!["photos", "attachments"].includes(mediaType)) {
        throw new AppError("Invalid media type", 400);
      }

      if (!Array.isArray(urls) || urls.length === 0) {
        throw new AppError("urls must be a non-empty array", 400);
      }

      if (!isAdmin) {
        await assertListingOwnership(listingId, uid);
      }

      const docRef = db.collection("properties").doc(listingId);
      const snap = await docRef.get();

      if (!snap.exists) throw new AppError("Property not found", 404);

      const currentMedia = snap.data()?.media?.[mediaType] ?? [];

      const mediaByUrl = new Map(currentMedia.map((item) => [item.url, item]));

      const reordered = urls
          .filter((url) => mediaByUrl.has(url))
          .map((url) => mediaByUrl.get(url));

      const urlSet = new Set(urls);
      const orphans = currentMedia.filter((item) => !urlSet.has(item.url));
      const finalMedia = [...reordered, ...orphans];

      await docRef.update({
        [`media.${mediaType}`]: finalMedia,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return finalMedia;
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(e.message || "Failed to reorder media", 500);
    }
  },

  setVirtualTourLink: async (listingId, url, {uid, isAdmin} = {}) => {
    if (!isAdmin) {
      await assertListingOwnership(listingId, uid);
    }

    const docRef = db.collection("properties").doc(listingId);
    const snap = await docRef.get();
    if (!snap.exists) throw new AppError("Property not found", 404);

    await docRef.update({
      "media.virtualTourLink": url || null,
      "updatedAt": FieldValue.serverTimestamp(),
    });

    return url || null;
  },

  getOwnerMostRecentProperty: async (uid) => {
    try {
      const snapshot = await db
          .collection("properties")
          .where("ownerId", "==", uid)
          .orderBy("updatedAt", "desc")
          .get();

      if (snapshot.empty) {
        return {
          property: null,
          stats: {active: 0, draft: 0, closed: 0, pending: 0},
        };
      }

      const properties = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };
      });

      const stats = properties.reduce(
          (acc, property) => {
            const status = property.status;
            if (acc[status] !== undefined) {
              acc[status] += 1;
            }
            return acc;
          },
          {active: 0, draft: 0, closed: 0, pending: 0},
      );

      return {
        property: properties[0], // most recent, since ordered by updatedAt desc
        stats,
      };
    } catch (e) {
      logger.error("Error in getOwnerMostRecentProperty:", e);
      throw new AppError(`Failed to fetch most recent owner property: ${e.message}`, 500);
    }
  },

  markStepCompleted: async (listingId, stepKey) => {
    try {
      const docRef = db.collection("properties").doc(listingId);
      const snap = await docRef.get();

      if (!snap.exists) {
        throw new AppError("Property not found", 404);
      }

      const data = snap.data();
      const validStepIds = getStepsForListing(getSelectedAddons(data)).map((s) => s.id);

      if (!validStepIds.includes(stepKey)) {
        throw new AppError(`"${stepKey}" is not a valid step for this listing`, 400);
      }

      await docRef.update({
        [`progressTracker.completedSteps.${stepKey}`]: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      logger.error("Error marking step completed:", e);
      throw new AppError(`Failed to mark step as completed: ${e.message}`, 500);
    }
  },

  markStepIncomplete: async (listingId, stepKey) => {
    try {
      const docRef = db.collection("properties").doc(listingId);
      const snap = await docRef.get();

      if (!snap.exists) {
        throw new AppError("Property not found", 404);
      }

      const data = snap.data();
      const validStepIds = getStepsForListing(getSelectedAddons(data)).map((s) => s.id);

      if (!validStepIds.includes(stepKey)) {
        throw new AppError(`"${stepKey}" is not a valid step for this listing`, 400);
      }

      await docRef.update({
        [`progressTracker.completedSteps.${stepKey}`]: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      logger.error("Error marking step incomplete:", e);
      throw new AppError(`Failed to mark step as incomplete: ${e.message}`, 500);
    }
  },

  /**
     * uid is the caller's own uid for the seller-facing route (ownership
     * enforced); pass null for the admin route, which is already gated by
     * verifyAdminFirebaseToken and needs to read any listing.
     */
  getProgressTracker: async (uid, listingId) => {
    try {
      const docRef = db.collection("properties").doc(listingId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new AppError("Property not found", 404);
      }

      const data = docSnap.data();

      if (uid && data.ownerId !== uid) {
        throw new AppError("Unauthorized access to this property", 403);
      }

      const completedSteps = data.progressTracker?.completedSteps ?? {};
      const selectedAddons = getSelectedAddons(data);

      const steps = getStepsForListing(selectedAddons).map((step) => {
        const completedAt = completedSteps[step.id];
        return {
          id: step.id,
          label: step.label,
          completed: Boolean(completedAt),
          completedAt: completedAt?.toDate?.() || completedAt || null,
        };
      });

      const completedCount = steps.filter((s) => s.completed).length;

      return {
        totalSteps: steps.length,
        completedCount,
        percentage: Math.round((completedCount / steps.length) * 100),
        steps,
      };
    } catch (e) {
      if (e instanceof AppError) throw e;
      logger.error("Error in getProgressTracker:", e);
      throw new AppError(`Failed to fetch progress tracker: ${e.message}`, 500);
    }
  },

  /**
     * Persists the caller's addon selection onto the listing. Called just
     * before checkout so the price stripeService calculates always matches
     * what's stored (and what getProgressTracker reads back for the
     * dynamic addon steps).
     */
  saveSelectedAddons: async (userId, listingId, selectedAddons) => {
    const docRef = db.collection("properties").doc(listingId);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new AppError("Property not found", 404);
    }

    const existing = snap.data();

    if (existing.ownerId !== userId) {
      throw new AppError("Unauthorized access to this property", 403);
    }

    if (existing.status === "submitted") {
      throw new AppError("Cannot edit a listing that has already been submitted", 409);
    }

    // Belt-and-suspenders: Joi already checked these against ADDONS_BY_ID
    // at the route level, but this is the layer that actually writes to
    // Firestore and feeds Stripe pricing, so re-check here too.
    const invalidIds = selectedAddons.filter((id) => !ADDONS_BY_ID[id]);
    if (invalidIds.length > 0) {
      throw new AppError(`Unknown addon id(s): ${invalidIds.join(", ")}`, 400);
    }

    try {
      await docRef.update({
        selectedAddons,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      logger.error("Error saving selected addons:", e);
      throw new AppError("Failed to save selected addons", 500);
    }

    return selectedAddons;
  },
};

module.exports = propertyService;
