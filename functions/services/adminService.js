require("dotenv").config();
const { db } = require("../config/db");
const AppError = require("../utils/AppError");

const adminService = {
      handleAdminLogin: async (email) => {
    try{
      if (!email || typeof email !== "string" || email.trim() === "") {
        return false;
      }

      const trimmedEmail = email.trim().toLowerCase();

      const snapshot = await db
        .collection("users")
        .where("email", "==", trimmedEmail)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return false;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      const isAdmin = userData.ifAdmin === true;

      return isAdmin;
    }catch(e){
      throw new AppError(e.message || 'Failed to Login', e.statusCode || 500);
    }
  }
}

module.exports = adminService