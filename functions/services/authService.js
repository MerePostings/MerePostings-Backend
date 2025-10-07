const firebaseAdmin = require("firebase-admin");
const {
  doc,
  collection,
  setDoc,
  serverTimestamp
} = require("firebase/firestore");
const { db } = require("../config/db");
const AppError = require("../utils/AppError");
const { sendVerificationEmail } = require('./mailService')

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(process.env.SIGNATURE),
});

function toE164(phoneNumber, countryCode = '+1') {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const prefix = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    return `${prefix}${digitsOnly}`;
}

authService = {

  signUp : async (
    { 
      firstName,
      lastName,
      email,
      password,
      oldPhone
    }) => {

    try{
    
      if (!firstName || !lastName || !email || !oldPhone || !password) {
          throw new AppError("Please fill in all of the required fields.", 400);
      }
  
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
  
      const phoneNumber =  toE164(oldPhone, '+1');
  
      if (!phoneRegex.test(phoneNumber)) {
          throw new AppError("Invalid phone number format.", 400);
      }

      const userRecord = await firebaseAdmin.auth().createUser({
          email,
          displayName: `${firstName} ${lastName}`,
          emailVerified: false,
          phoneNumber,
          password,
          disabled: false,
      });

      
      const usersCollectionRef = collection(db, "users");
      const userRef = doc(usersCollectionRef, userRecord.uid);
      
      await setDoc(userRef, {
        firstName,
        lastName,
        email,
        phoneNumber,
        createdAt: serverTimestamp(), 
      });

      
      const actionCodeSettings = {
        url: "http://localhost:5173",
        handleCodeInApp: true,
      };
      
      const emailVerificationLink = await firebaseAdmin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings);

      await sendVerificationEmail(email, emailVerificationLink, firstName);
      
    }catch (err) {
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

  ifUserVerified : async ({ email }) => {
    try{
      const userRecord = await firebaseAdmin.auth().getUserByEmail(email);

      const hasPhoneNumber = !!userRecord.phoneNumber;

      return {
        exists: true,
        emailVerified: userRecord.emailVerified,
        phoneVerified: hasPhoneNumber,
        disabled: userRecord.disabled,
      };
    }catch(err){
      if (err.code === "auth/user-not-found") {
        return { exists: false, message: "User not found." };
      } else {
        throw new AppError(err.message, 500);
      }
    }
  }

}


module.exports = authService