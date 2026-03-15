const firebaseAdmin = require("../config/firebaseAdmin");

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
    req.user = decodedToken; 

    next();
  } catch (error) {
    console.error("Firebase Auth error:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = verifyFirebaseToken;
