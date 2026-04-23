import express from "express";
import { registerUser, loginUser,getLatestConsentVersion,acceptConsent,revokeConsent,reportUser,updateLocations,getLocations} from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.js";
import { saveFcmToken } from "../controllers/user.controller.js";
const router = express.Router();

router.post("/register", (req, res, next) => {
	console.log("/register route middleware hit");
	next();
}, registerUser);
router.post("/login", loginUser);
router.post("/save-fcm-token",authMiddleware, saveFcmToken);
router.get("/getLatestConsentVersion", getLatestConsentVersion);
router.post("/acceptConsent", authMiddleware, acceptConsent);
router.post("/revokeConsent", authMiddleware, revokeConsent);
router.post("/reportUser", authMiddleware, reportUser);
router.post("/locations", updateLocations);
router.get("/locations", getLocations);

export default router;
