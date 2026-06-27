import mongoose from "mongoose";
import Chat from "../models/chat.model.js";
import Review from "../models/review.model.js";
import User from "../models/user.model.js";

export const PUBLIC_TRUST_SELECT =
  "name profilePic createdAt ratingAvg reviewCount completedSales trustScore badges responseRate";

export const BADGE_LEVELS = {
  TRUSTED: "trusted",
  ESTABLISHED: "established",
  NEW: "new",
  CAUTION: "caution",
};

export function calculateTrustScore(user) {
  let score = 50;

  if (user.reviewCount > 0 && user.ratingAvg > 0) {
    score += ((user.ratingAvg / 5) * 25) - 5;
  }

  score += Math.min(user.completedSales || 0, 10) * 1.5;

  if (user.createdAt) {
    const daysOld = (Date.now() - new Date(user.createdAt).getTime()) / 86400000;
    score += Math.min(daysOld / 30, 1) * 10;
  }

  if (user.responseRate != null && !Number.isNaN(user.responseRate)) {
    score += user.responseRate * 10;
  }

  score -= (user.reportCounter || 0) * 10;

  if (user.isBlocked) {
    score -= 40;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deriveBadges(user, trustScore) {
  const reports = user.reportCounter || 0;
  const sales = user.completedSales || 0;
  const reviews = user.reviewCount || 0;
  const interactions = sales + reviews;
  const daysOld = user.createdAt
    ? (Date.now() - new Date(user.createdAt).getTime()) / 86400000
    : 0;

  if (user.isBlocked || reports >= 2 || trustScore < 40) {
    return [{ id: BADGE_LEVELS.CAUTION, label: "Caution", level: BADGE_LEVELS.CAUTION }];
  }

  if (user.ratingAvg >= 4.5 && reviews >= 1 && sales >= 5 && reports === 0) {
    return [{ id: BADGE_LEVELS.TRUSTED, label: "Trusted", level: BADGE_LEVELS.TRUSTED }];
  }

  if (sales >= 3 && daysOld >= 30) {
    return [{ id: BADGE_LEVELS.ESTABLISHED, label: "Established", level: BADGE_LEVELS.ESTABLISHED }];
  }

  if (interactions < 3) {
    return [{ id: BADGE_LEVELS.NEW, label: "New", level: BADGE_LEVELS.NEW }];
  }

  return [];
}

const LOW_TRUST_THRESHOLD = 40;
const LOW_RATING_THRESHOLD = 2.5;

export function getChatTrustCaution(user) {
  if (!user) return { show: false, reason: null };

  const trustScore = user.trustScore ?? 50;
  const ratingAvg = user.ratingAvg || 0;
  const reviewCount = user.reviewCount || 0;
  const reports = user.reportCounter || 0;
  const badgeLevel = user.badges?.[0]?.level;

  const hasCautionBadge = badgeLevel === BADGE_LEVELS.CAUTION;
  const lowTrust = trustScore < LOW_TRUST_THRESHOLD;
  const lowRating = reviewCount >= 1 && ratingAvg <= LOW_RATING_THRESHOLD;

  if (!hasCautionBadge && !lowTrust && !lowRating) {
    return { show: false, reason: null };
  }

  if (lowRating) {
    return {
      show: true,
      reason: `Rated ${ratingAvg.toFixed(1)}★ from past deals — proceed carefully.`,
    };
  }

  if (reports >= 2) {
    return {
      show: true,
      reason: "Reported multiple times by other users.",
    };
  }

  if (lowTrust) {
    return {
      show: true,
      reason: "Very low trust score — meet in public and pay only after inspecting the item.",
    };
  }

  if (hasCautionBadge) {
    return {
      show: true,
      reason: "This account has raised trust concerns.",
    };
  }

  return { show: false, reason: null };
}

async function computeResponseRate(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const result = await Chat.aggregate([
    { $match: { to: uid } },
    { $sort: { createdAt: -1 } },
    { $limit: 40 },
    {
      $lookup: {
        from: Chat.collection.name,
        let: { adId: "$adId", receivedAt: "$createdAt" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$adId", "$$adId"] },
                  { $eq: ["$from", uid] },
                  { $gt: ["$createdAt", "$$receivedAt"] },
                  { $lte: ["$createdAt", { $add: ["$$receivedAt", 86400000] }] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: "replies",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        replied: {
          $sum: { $cond: [{ $gt: [{ $size: "$replies" }, 0] }, 1, 0] },
        },
      },
    },
  ]);

  if (!result.length || !result[0].total) return null;

  const { total, replied } = result[0];
  return Math.round((replied / total) * 100) / 100;
}

async function syncReviewAggregates(user) {
  const [stats] = await Review.aggregate([
    { $match: { reviewee: user._id } },
    {
      $group: {
        _id: null,
        reviewCount: { $sum: 1 },
        ratingSum: { $sum: "$rating" },
      },
    },
  ]);

  const reviewCount = stats?.reviewCount || 0;
  user.reviewCount = reviewCount;
  user.ratingAvg = reviewCount
    ? Math.round((stats.ratingSum / reviewCount) * 10) / 10
    : 0;
}

export async function recalculateUserTrust(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  await syncReviewAggregates(user);

  const responseRate = await computeResponseRate(userId);
  user.responseRate = responseRate;

  const trustScore = calculateTrustScore(user);
  const badges = deriveBadges(user, trustScore);

  user.trustScore = trustScore;
  user.badges = badges;
  await user.save();

  return {
    ratingAvg: user.ratingAvg,
    reviewCount: user.reviewCount,
    completedSales: user.completedSales,
    trustScore: user.trustScore,
    badges: user.badges,
    responseRate: user.responseRate,
  };
}

export function formatTrustProfile(user) {
  if (!user) return null;
  const profile = {
    _id: user._id,
    name: user.name,
    profilePic: user.profilePic,
    ratingAvg: user.ratingAvg || 0,
    reviewCount: user.reviewCount || 0,
    completedSales: user.completedSales || 0,
    trustScore: user.trustScore ?? 50,
    badges: user.badges || [],
    responseRate: user.responseRate,
  };
  profile.caution = getChatTrustCaution(user);
  return profile;
}
