const firebaseAdmin = require("../config/firebaseAdmin");
const { db } = require("../config/db");
const AppError = require("../utils/AppError");
const { sendVerificationEmail } = require('./mailService')
const { createContactIfNotExists } = require("../config/hubspotSDK")
const { FieldValue } = require('firebase-admin/firestore');

authService = {

  signUp : async (
    { 
      firstName,
      lastName,
      email,
      password,
      termsAccepted,
      marketingOptIn
    }) => {

    try{
    
      if (!firstName || !lastName || !email || !password) {
          throw new AppError("Please fill in all of the required fields.", 400);
      }
  
      const issues = [];
      const SPECIAL = /[!@#$%^&*()_+\-=\[\]{}|;:",./<>?]/;

      if (password.length < 8) issues.push(`≥${8} chars`);
      if (!/[A-Z]/.test(password))
        issues.push("add minimum of one uppercase letter");
      if (!/[a-z]/.test(password))
        issues.push("add minimum of one lowercase letter");
      if (!/\d/.test(password)) issues.push("add minimum of one number");
      if (!SPECIAL.test(password))
        issues.push("add minimum of one special character");

      if (issues.length !== 0) throw new AppError(issues[0], 400);

      let existingUser = null;

      try {
        existingUser = await firebaseAdmin.auth().getUserByEmail(email);
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          throw new AppError(error.message || "Failed to sign up. Please try agian.", error.statusCode || 500); // unexpected error
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

        ...(termsAccepted && {
          termsVersion: 1,
          acceptedDate: FieldValue.serverTimestamp(),
        }),
      });

      createContactIfNotExists({email:email,firstname:firstName,lastname:lastName,platform_affiliation:"Mere Postings"});
      
      const actionCodeSettings = {
        url: process.env.FRONTEND_URL,
        handleCodeInApp: true,
      };
      
      const emailVerificationLink = await firebaseAdmin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings);

      await sendVerificationEmail(email, emailVerificationLink, firstName);
      
    }catch (err) {
      console.log(err)
      try{
        if (err instanceof AppError) {
          throw new AppError(err.message, err.statusCode)
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
      }catch(err){
        throw new AppError(err.message, err.statusCode)
      }
    }
  },

  getUserById: async (id) => {
    try {
      const docRef = db.collection("users").doc(id);
      const docSnap = await docRef.get();

      const user = {
        firstName: docSnap.data().firstName,
        lastName: docSnap.data().lastName,
        email: docSnap.data().email,
      };

      return user;
    } catch (err) {
      throw new AppError("User Not Found!", 400);
    }
  },

}


module.exports = authService