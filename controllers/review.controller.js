import mongoose from "mongoose";
import Ad from "../models/ad.model.js";
import User from "../models/user.model.js";
import Review, { REVIEW_TAGS, REVIEW_EXPIRY_DAYS } from "../models/review.model.js";
import { sendReviewPromptNotification } from "../services/pushService.js";
import {
  PUBLIC_TRUST_SELECT,
  recalculateUserTrust,
  formatTrustProfile,
} from "../services/trustScore.service.js";

const SELLER_SELECT = PUBLIC_TRUST_SELECT;

function getReviewExpiryDate(ad) {
  const soldAt = ad.soldAt || ad.updatedAt || ad.createdAt;
  const expiry = new Date(soldAt);
  expiry.setDate(expiry.getDate() + REVIEW_EXPIRY_DAYS);
  return expiry;
}

function getReviewContext(ad, userId) {
  if (!ad?.isSold || !ad.soldTo) {
    return { eligible: false, reason: "Reviews are only available for in-app sales." };
  }

  const sellerId = ad.seller._id?.toString() || ad.seller.toString();
  const buyerId = ad.soldTo._id?.toString() || ad.soldTo.toString();
  const uid = userId.toString();

  if (uid !== sellerId && uid !== buyerId) {
    return { eligible: false, reason: "You were not part of this sale." };
  }

  if (new Date() > getReviewExpiryDate(ad)) {
    return { eligible: false, reason: "The review period has expired." };
  }

  const role = uid === sellerId ? "seller" : "buyer";
  const revieweeId = role === "seller" ? buyerId : sellerId;

  return { eligible: true, role, revieweeId };
}

async function recalculateUserRating(userId) {
  return recalculateUserTrust(userId);
}

export const submitReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { adId, rating, tags = [], text = "" } = req.body;

    if (!adId) {
      return res.status(400).json({ message: "adId is required" });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const ad = await Ad.findById(adId)
      .populate("seller", SELLER_SELECT)
      .populate("soldTo", SELLER_SELECT);

    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    const context = getReviewContext(ad, userId);
    if (!context.eligible) {
      return res.status(403).json({ message: context.reason });
    }

    const existing = await Review.findOne({ ad: adId, reviewer: userId });
    if (existing) {
      return res.status(400).json({ message: "You have already reviewed this sale." });
    }

    const validTags = Array.isArray(tags)
      ? tags.filter((tag) => REVIEW_TAGS.includes(tag))
      : [];

    const review = await Review.create({
      ad: adId,
      reviewer: userId,
      reviewee: context.revieweeId,
      role: context.role,
      rating: numericRating,
      tags: validTags,
      text: String(text).slice(0, 200),
    });

    const reputation = await recalculateUserRating(context.revieweeId);

    const populated = await Review.findById(review._id)
      .populate("reviewer", "name profilePic")
      .populate("reviewee", "name profilePic ratingAvg reviewCount");

    res.status(201).json({
      message: "Review submitted",
      review: populated,
      reputation,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this sale." });
    }
    console.error("Error submitting review:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    let user = await User.findById(userId).select(`${SELLER_SELECT} reportCounter isBlocked`);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.badges?.length) {
      await recalculateUserTrust(userId);
      user = await User.findById(userId).select(SELLER_SELECT);
    }

    const [reviews, total] = await Promise.all([
      Review.find({ reviewee: userId })
        .populate("reviewer", "name profilePic")
        .populate("ad", "title images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ reviewee: userId }),
    ]);

    res.json({
      user: formatTrustProfile(user) || user,
      reviews,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching user reviews:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPendingReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const ads = await Ad.find({
      isSold: true,
      soldTo: { $ne: null },
      $or: [{ seller: userObjectId }, { soldTo: userObjectId }],
    })
      .populate("seller", "name profilePic")
      .populate("soldTo", "name profilePic")
      .sort({ soldAt: -1, updatedAt: -1 })
      .limit(50);

    const submitted = await Review.find({ reviewer: userId }).select("ad");
    const submittedAdIds = new Set(submitted.map((r) => r.ad.toString()));

    const pending = [];

    for (const ad of ads) {
      if (submittedAdIds.has(ad._id.toString())) continue;

      const context = getReviewContext(ad, userId);
      if (!context.eligible) continue;

      const reviewee =
        context.role === "seller"
          ? ad.soldTo
          : ad.seller;

      pending.push({
        adId: ad._id,
        adTitle: ad.title,
        adImage: ad.images?.[0] || null,
        role: context.role,
        revieweeId: reviewee._id,
        revieweeName: reviewee.name,
        revieweePic: reviewee.profilePic || null,
        expiresAt: getReviewExpiryDate(ad),
      });
    }

    res.json({ pending });
  } catch (err) {
    console.error("Error fetching pending reviews:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getReviewStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { adId } = req.params;

    const ad = await Ad.findById(adId)
      .populate("seller", SELLER_SELECT)
      .populate("soldTo", SELLER_SELECT);

    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    const context = getReviewContext(ad, userId);
    const existingReview = await Review.findOne({ ad: adId, reviewer: userId })
      .populate("reviewee", "name profilePic");

    const reviewee =
      context.eligible
        ? (context.role === "seller" ? ad.soldTo : ad.seller)
        : null;

    res.json({
      canReview: context.eligible && !existingReview,
      alreadyReviewed: !!existingReview,
      reason: context.eligible ? null : context.reason,
      role: context.role || null,
      reviewee: reviewee
        ? {
            _id: reviewee._id,
            name: reviewee.name,
            profilePic: reviewee.profilePic || null,
          }
        : null,
      existingReview,
      expiresAt: context.eligible ? getReviewExpiryDate(ad) : null,
      tags: REVIEW_TAGS,
    });
  } catch (err) {
    console.error("Error fetching review status:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getReviewTags = (_req, res) => {
  res.json({ tags: REVIEW_TAGS, expiryDays: REVIEW_EXPIRY_DAYS });
};
