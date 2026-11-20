const { applicationDefault, cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function getFirebaseAuth() {
  if (getApps().length === 0) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = cert(serviceAccount);
    } else {
      credential = applicationDefault();
    }
    initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  return getAuth();
}

async function requireFirebaseAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: "Sign in to continue." });

  try {
    req.firebaseUser = await getFirebaseAuth().verifyIdToken(match[1]);
    if (!req.firebaseUser.uid || !req.firebaseUser.email) {
      return res.status(401).json({ message: "Firebase token has no user email." });
    }
    next();
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);
    if (error.code === "app/invalid-credential" || error.code === "app/credential-implementation-failed") {
      return res.status(503).json({ message: "Firebase Admin credentials are not configured." });
    }
    return res.status(401).json({ message: "Your sign-in has expired. Please log in again." });
  }
}

module.exports = requireFirebaseAuth;
