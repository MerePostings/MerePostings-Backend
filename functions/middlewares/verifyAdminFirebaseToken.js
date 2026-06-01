const firebaseAdmin = require("../config/firebaseAdmin");
const { db } = require("../config/db");

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

    const docRef = db.collection("users").doc(decodedToken.uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(401).json({ error: "User not found" });
    }

    const userData = docSnap.data();
    if (!userData.ifAdmin) {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }

    req.user = {
      uid: decodedToken.uid,
      ...userData,
    };

    next();
  } catch (error) {
    console.error("Firebase Auth error:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = verifyFirebaseToken;
