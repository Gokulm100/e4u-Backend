import express from "express";
import { getLatestMessages,createAd, getAllAds, getAdById, deleteAd,getAllAdCategories,getUserAds,editAd,createChat,getChats,getUserMessages,getBuyingMessages,getSellingMessages,summarizeAdUsingAi ,markMessagesAsSeen,incrementViews,getUsersInterestedInAd,markAdAsSold,disableAd,enableAd} from "../controllers/ad.controller.js";
import authMiddleware from "../middleware/auth.js";
import fileUpload from "../middleware/fileUpload.js";

const router = express.Router();

router.get("/listCategories", getAllAdCategories);
router.post("/listUserAds", getUserAds);
router.post("/", getAllAds);
router.post("/postAdd", authMiddleware, fileUpload.array('images'), createAd);
router.get("/chat", getChats);
router.get("/:id", getAdById);
router.delete("/:id", authMiddleware, deleteAd);
router.put("/edit/:id", authMiddleware, fileUpload.array('images'), editAd);
router.post("/chat",authMiddleware, createChat);
router.post("/latestMessages", authMiddleware, getLatestMessages);
router.post("/getUserMessages", authMiddleware, getUserMessages);
router.post("/getSellingMessages", authMiddleware, getSellingMessages);
router.post("/getBuyingMessages", authMiddleware, getBuyingMessages);
router.post("/summarizeAdUsingAi", summarizeAdUsingAi);
router.post("/markMessagesAsSeen", authMiddleware, markMessagesAsSeen);
router.post("/incrementViews", authMiddleware, incrementViews);
router.post("/getUsersInterestedInAd", getUsersInterestedInAd);
router.post("/markAdAsSold", authMiddleware, markAdAsSold);
router.post("/disableAd", authMiddleware, disableAd);
router.post("/enableAd", authMiddleware, enableAd);




export default router;
