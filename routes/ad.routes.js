import express from "express";
import { createAd, getAllAds, getAdById, deleteAd,getAllAdCategories } from "../controllers/ad.controller.js";
import authMiddleware from "../middleware/auth.js";
import fileUpload from "../middleware/fileUpload.js";

const router = express.Router();

router.post("/postAdd", authMiddleware, fileUpload.array('image'), createAd);
router.get("/", getAllAds);
router.get("/listCategories", getAllAdCategories);
router.delete("/:id", authMiddleware, deleteAd);
router.get("/:id", getAdById);

export default router;
