const logger = require("firebase-functions/logger");
const firebaseAdmin = require("../config/firebaseAdmin");
const {db} = require("../config/db");
const AppError = require("../utils/AppError");
const {sendVerificationEmail} = require("./mailService");
const {createContactIfNotExists} = require("../config/hubspotSDK");
const {FieldValue} = require("firebase-admin/firestore");
const {toSiteActionLink} = require("../utils/authActionLink");

const VERIFICATION_EMAIL_COOLDOWN_MS = 60 * 1000;

const firstNameOf = (userRecord) => userRecord.displayName?.split(" ")[0];

/** Generates a verification link on our own /email-verified page and emails it. */
async function emailVerificationLink(email, firstName) {
  const firebaseLink = await firebaseAdmin.auth().generateEmailVerificationLink(email);
  await sendVerificationEmail(email, toSiteActionLink(firebaseLink), firstName);
}

/**
 * Reserves this user's next verification email, or 429s if one went out less
 * than VERIFICATION_EMAIL_COOLDOWN_MS ago. Done in a transaction so two
 * concurrent resends can't both pass. Returns the previous send time so a
 * failed send can hand the slot back.
 */
async function claimVerificationEmailSlot(userRef) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const lastSentAt = snap.exists ? snap.data().lastVerificationEmailAt : undefined;
    const elapsed = lastSentAt ? Date.now() - lastSentAt.toMillis() : Infinity;

    if (elapsed < VERIFICATION_EMAIL_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((VERIFICATION_EMAIL_COOLDOWN_MS - elapsed) / 1000);
      throw new AppError(
          `Please wait ${retryAfterSeconds} seconds before requesting another email.`,
          429,
          {code: "VERIFICATION_EMAIL_COOLDOWN", retryAfterSeconds},
      );
    }

    tx.set(userRef, {
      lastVerificationEmailAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    return lastSentAt;
  });
}

const authService = {

  signUp: async (
      {
        firstName,
        lastName,
        email,
        password,
        termsAccepted,
        marketingOptIn,
      }) => {
    try {
      if (!firstName || !lastName || !email || !password) {
        throw new AppError("Please fill in all of the required fields.", 400);
      }

      if (termsAccepted !== true) {
        throw new AppError("You must accept the Terms of Service to sign up.", 400);
      }

      const issues = [];
      const SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;:",./<>?]/;

      if (password.length < 8) issues.push(`≥${8} chars`);
      if (!/[A-Z]/.test(password)) {
        issues.push("add minimum of one uppercase letter");
      }
      if (!/[a-z]/.test(password)) {
        issues.push("add minimum of one lowercase letter");
      }
      if (!/\d/.test(password)) issues.push("add minimum of one number");
      if (!SPECIAL.test(password)) {
        issues.push("add minimum of one special character");
      }

      if (issues.length !== 0) throw new AppError(issues[0], 400);

      let existingUser = null;

      try {
        existingUser = await firebaseAdmin.auth().getUserByEmail(email);
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          logger.error("[auth] Unexpected error checking for existing user:", error);
          throw new AppError("Failed to sign up. Please try again.", 500); // unexpected error
        }
      }

      if (existingUser) {
        throw new AppError("Email is already in use.", 422);
      }

      const userRecord = await firebaseAdmin.auth().createUser({
        email,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false,
        password,
        disabled: false,
      });

      const usersCollectionRef = db.collection("users").doc(userRecord.uid);
      await usersCollectionRef.set({
        firstName,
        lastName,
        email,
        createdAt: FieldValue.serverTimestamp(),
        ...(marketingOptIn && {
          marketing: true,
        }),
        termsVersion: 1,
        acceptedDate: FieldValue.serverTimestamp(),
      });

      createContactIfNotExists({email: email, firstname: firstName, lastname: lastName, platform_affiliation: "Mere Postings"});

      // The account exists at this point, so a failed email mustn't fail the
      // sign-up: the user can resend from the verify-email screen.
      try {
        await emailVerificationLink(email, firstName);
        await usersCollectionRef.update({lastVerificationEmailAt: FieldValue.serverTimestamp()});
      } catch (mailError) {
        logger.error("[auth] Sign-up verification email failed", {uid: userRecord.uid, message: mailError.message});
      }
    } catch (err) {
      logger.error(err);
      try {
        if (err instanceof AppError) {
          throw new AppError(err.message, err.statusCode);
        } else if (err.code === "auth/email-already-exists") {
          throw new AppError("The email address is already in use by another account.", 400);
        } else if (err.code === "auth/invalid-phone-number") {
          throw new AppError("Invalid phone number format. Please use E.164 format.", 400);
        } else if (err.code === "auth/weak-password") {
          throw new AppError("The password is too weak. Please choose a stronger password.", 400);
        } else if (err.code === "auth/phone-number-already-exists") {
          throw new AppError("The phone number is already in use by another account.", 400);
        } else {
          throw new AppError("An error occurred while signing up the user.", 500);
        }
      } catch (err) {
        throw new AppError(err.message, err.statusCode);
      }
    }
  },

  /**
     * Called by an authenticated-but-unverified user from the "verify your
     * email" gate screen. Uses req.user.uid (from verifyFirebaseToken) rather
     * than trusting a client-supplied email, so a signed-in user can only
     * ever resend to their own address.
     *
     * @return {Promise<{status: "sent", retryAfterSeconds: number} | {status: "already_verified"}>}
     */
  resendVerificationEmail: async (uid) => {
    const userRecord = await firebaseAdmin.auth().getUser(uid);

    if (userRecord.emailVerified) return {status: "already_verified"};
    if (!userRecord.email) throw new AppError("Your account has no email address.", 400);

    const userRef = db.collection("users").doc(uid);
    const previousSentAt = await claimVerificationEmailSlot(userRef);

    try {
      await emailVerificationLink(userRecord.email, firstNameOf(userRecord));
    } catch (err) {
      // Nothing was sent, so don't make the user wait out the cooldown.
      await userRef.update({lastVerificationEmailAt: previousSentAt ?? FieldValue.delete()})
          .catch((restoreError) => logger.error("[auth] Couldn't release verification cooldown", restoreError));
      if (err instanceof AppError) throw err;
      logger.error("[auth] Couldn't generate verification link", {uid, code: err.code, message: err.message});
      throw new AppError("We couldn't send the email right now. Please try again in a few minutes.", 502);
    }

    return {status: "sent", retryAfterSeconds: VERIFICATION_EMAIL_COOLDOWN_MS / 1000};
  },

};


module.exports = authService;
