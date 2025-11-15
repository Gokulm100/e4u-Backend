import express from "express";
import { registerUser, loginUser } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.js";
import { saveFcmToken } from "../controllers/user.controller.js";
const router = express.Router();

router.post("/register", (req, res, next) => {
	console.log("/register route middleware hit");
	next();
}, registerUser);
router.post("/login", loginUser);
router.post("/save-fcm-token",authMiddleware, saveFcmToken);

export default router;
