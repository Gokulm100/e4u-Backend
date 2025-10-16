import express from "express";
import { registerUser, loginUser } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", (req, res, next) => {
	console.log("/register route middleware hit");
	next();
}, registerUser);
router.post("/login", loginUser);

export default router;
