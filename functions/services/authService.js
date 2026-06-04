const firebaseAdmin = require("../config/firebaseAdmin");
const { db } = require("../config/db");
const AppError = require("../utils/AppError");
const { sendVerificationEmail } = require('./mailService')
const { createContactIfNotExists } = require("../config/hubspotSDK")
const { FieldValue } = require('firebase-admin/firestore');

const authService = {

  signUp : async ({ firstName, lastName, email, password, termsAccepted, marketingOptIn }) => {
    let existingUser = null;
    try {
      existingUser = await firebaseAdmin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw new AppError(error.message || "Failed to sign up. Please try again.", 500);
      }
    }

    if (existingUser) {
      throw new AppError("Email is already in use.", 422);
    }

    let userRecord;
    try {
      userRecord = await firebaseAdmin.auth().createUser({
        email,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false,
        password,
        disabled: false,
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        throw new AppError("The email address is already in use by another account.", 400);
      } else if (err.code === "auth/weak-password") {
        throw new AppError("The password is too weak. Please choose a stronger password.", 400);
      } else {
        throw new AppError("An error occurred while signing up. Please try again.", 500);
      }
    }

    try{
      const usersCollectionRef = db.collection("users").doc(userRecord.uid);
      await usersCollectionRef.set({
          firstName,
          lastName,
          email,
          createdAt: FieldValue.serverTimestamp(),
          ...(marketingOptIn && { marketing: true }),
          ...(termsAccepted && {
              termsVersion: 1,
              acceptedDate: FieldValue.serverTimestamp(),
          }),
      });
    }catch(err){
      throw new AppError("Failed to create user. Please try again.", 500);
    }

    createContactIfNotExists({
        email,
        firstname: firstName,
        lastname: lastName,
        platform_affiliation: "Mere Postings",
    });

    const actionCodeSettings = {
        url: process.env.FRONTEND_URL,
        handleCodeInApp: true,
    };
    
    try{
      const emailVerificationLink = await firebaseAdmin
          .auth()
          .generateEmailVerificationLink(email, actionCodeSettings);
  
      await sendVerificationEmail(email, emailVerificationLink, firstName);
    }catch(err){
      throw new AppError("Failed to send verification email. Please try again.", 500);
    }
  },

}

module.exports = authService