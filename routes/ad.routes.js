import express from "express";
import { createAd, getAllAds, getAdById, deleteAd } from "../controllers/ad.controller.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/", authMiddleware, createAd);
router.get("/", getAllAds);
router.get("/:id", getAdById);
router.delete("/:id", authMiddleware, deleteAd);

export default router;
