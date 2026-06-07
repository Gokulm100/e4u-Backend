import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  submitReview,
  getUserReviews,
  getPendingReviews,
  getReviewStatus,
  getReviewTags,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/tags", getReviewTags);
router.get("/pending", authMiddleware, getPendingReviews);
router.get("/status/:adId", authMiddleware, getReviewStatus);
router.get("/user/:userId", getUserReviews);
router.post("/", authMiddleware, submitReview);

export default router;
