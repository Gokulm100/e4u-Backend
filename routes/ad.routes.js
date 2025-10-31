import express from "express";
import { getLatestMessages,createAd, getAllAds, getAdById, deleteAd,getAllAdCategories,getUserAds,editAd,createChat,getChats,getUserMessages } from "../controllers/ad.controller.js";
import authMiddleware from "../middleware/auth.js";
import fileUpload from "../middleware/fileUpload.js";

const router = express.Router();

router.get("/listCategories", getAllAdCategories);
router.post("/listUserAds", getUserAds);
router.post("/", getAllAds);
router.post("/postAdd", authMiddleware, fileUpload.array('image'), createAd);
router.get("/chat", getChats);
router.get("/:id", getAdById);
router.delete("/:id", authMiddleware, deleteAd);
router.put("/edit/:id", authMiddleware, fileUpload.array('image'), editAd);
router.post("/chat", createChat);
router.post("/latestMessages", authMiddleware, getLatestMessages);
router.post("/getUserMessages", authMiddleware, getUserMessages);

export default router;
