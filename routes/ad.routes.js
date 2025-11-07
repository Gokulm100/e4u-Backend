import express from "express";
import { getLatestMessages,createAd, getAllAds, getAdById, deleteAd,getAllAdCategories,getUserAds,editAd,createChat,getChats,getUserMessages,getBuyingMessages,getSellingMessages } from "../controllers/ad.controller.js";
import authMiddleware from "../middleware/auth.js";
import fileUpload from "../middleware/fileUpload.js";

const router = express.Router();

router.get("/listCategories", getAllAdCategories);
router.post("/listUserAds", getUserAds);
router.post("/", authMiddleware, getAllAds);
router.post("/postAdd", authMiddleware, fileUpload.array('images'), createAd);
router.get("/chat", getChats);
router.get("/:id", getAdById);
router.delete("/:id", authMiddleware, deleteAd);
router.put("/edit/:id", authMiddleware, fileUpload.array('images'), editAd);
router.post("/chat", createChat);
router.post("/latestMessages", authMiddleware, getLatestMessages);
router.post("/getUserMessages", authMiddleware, getUserMessages);
router.post("/getSellingMessages", authMiddleware, getSellingMessages);
router.post("/getBuyingMessages", authMiddleware, getBuyingMessages);



export default router;
