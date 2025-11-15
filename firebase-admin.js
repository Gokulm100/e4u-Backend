
import admin from "firebase-admin";
let serviceAccount;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  // Parse service account from environment variable (should be a JSON string)
  serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else {
  // Fallback to local file for development
  serviceAccount = (await import("./serviceAccountKey.json", { assert: { type: "json" } })).default;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export default admin;
