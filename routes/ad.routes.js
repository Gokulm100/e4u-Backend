import express from "express";
import { createAd, getAllAds, getAdById, deleteAd,getAllAdCategories,getUserAds,editAd } from "../controllers/ad.controller.js";
import authMiddleware from "../middleware/auth.js";
import fileUpload from "../middleware/fileUpload.js";

const router = express.Router();

router.get("/listCategories", getAllAdCategories);
router.post("/listUserAds", getUserAds);
router.post("/", getAllAds);
router.post("/postAdd", authMiddleware, fileUpload.array('image'), createAd);
router.get("/:id", getAdById);
router.delete("/:id", authMiddleware, deleteAd);
router.put("/edit/:id", authMiddleware, fileUpload.array('image'), editAd);
export default router;
