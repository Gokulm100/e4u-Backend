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

async function computeResponseRate(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const received = await Chat.find({ to: uid })
    .sort({ createdAt: -1 })
    .limit(40)
    .select("adId createdAt")
    .lean();

  if (received.length === 0) return null;

  let replied = 0;
  for (const msg of received) {
    const hasReply = await Chat.exists({
      adId: msg.adId,
      from: uid,
      createdAt: {
        $gt: msg.createdAt,
        $lte: new Date(msg.createdAt.getTime() + 86400000),
      },
    });
    if (hasReply) replied += 1;
  }

  return Math.round((replied / received.length) * 100) / 100;
}

async function syncReviewAggregates(user) {
  const reviews = await Review.find({ reviewee: user._id }).select("rating");
  const reviewCount = reviews.length;
  const ratingAvg = reviewCount
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  user.reviewCount = reviewCount;
  user.ratingAvg = ratingAvg;
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
  return {
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
}
