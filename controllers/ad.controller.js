import Chat from "../models/chat.model.js";
import Ad from "../models/ad.model.js";
import AdCategory from "../models/ad.category.model.js";


import mongoose from "mongoose";


export const getLatestMessages = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user?.id);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { userId, adId } = req.body;
    if (!userId || !adId) {
      return res.status(400).json({ message: "userId and adId are required" });
    }
    // Aggregate latest messages for a specific ad, grouped by users other than current user
    const latestMessages = await Chat.aggregate([
      {
        $match: {
          adId: typeof adId === "string" ? new mongoose.Types.ObjectId(adId) : adId,
          from: { $ne: currentUserId } 
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: { user: { $cond: [ { $eq: ["$from", userId] }, "$to", "$from" ] } },
          message: { $first: "$message" },
          createdAt: { $first: "$createdAt" },
          from: { $first: "$from" },
          to: { $first: "$to" }
        }
      },
      {
        $project: {
          user: "$_id.user",
          message: 1,
          createdAt: 1,
          from: 1,
          to: 1,
          _id: 0
        }
      }
    ]);

    // Populate from and to user names
    const populated = await Chat.populate(latestMessages, [
      { path: "from", select: "name email" },
      { path: "to", select: "name email" }
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getChats = async (req, res) => {
  try {
    const { adId, userId } = req.query;
    if (!adId || !userId) {
      return res.status(400).json({ message: "adId and userId are required" });
    }
    console.log("Fetching chats for adId:", adId, "and userId:", userId);
    // Convert adId and userId to ObjectId
    let adObjectId, userObjectId;
    try {
      adObjectId = new mongoose.Types.ObjectId(adId);
      userObjectId = new mongoose.Types.ObjectId(userId);
      console.log("Converted adId and userId to ObjectId:", adObjectId, userObjectId);
    } catch (e) {
      return res.status(400).json({ message: "Invalid adId or userId format" });
    }
    // Find chats for this ad where user is either sender or receiver
    const chats = await Chat.find({
      adId: adObjectId,
      $or: [ { to: userObjectId }, { from: userObjectId } ]
    }).populate([{ path: "from", select: "name email" }, { path: "to", select: "name email" }]).sort({ createdAt: 1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createChat = async (req, res) => {
  try {
    const { adId, message, to, from } = req.body;
    if (!adId || !message || !to || !from) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const chat = await Chat.create({ adId, message, to, from });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const editAd = async (req, res) => {
  try {
    console.log("[PUT] /api/ads/edit/:id - Body:", req.body);
    const adId = req.params.id;
    // Collect update data
    const updateData = { ...req.body };
    // If new images are uploaded, handle them
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      updateData.images = req.files.map(file => file.path || file.location || file.url);
    }
    // Prevent changing the seller or _id
    delete updateData.seller;
    delete updateData._id;
    // Update the ad
    const updatedAd = await Ad.findByIdAndUpdate(adId, updateData, { new: true });
    if (!updatedAd) return res.status(404).json({ message: "Ad not found" });
    res.json(updatedAd);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const createAd = async (req, res) => {
  try {
    console.log("[POST] /api/ads/postAdd - Body:", req.body);
    console.log("[POST] /api/ads/postAdd - Files:", req.files);
    // Handle image upload
    const imageUrls = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        imageUrls.push(file.path || file.location || file.url);
      }
    }

    // Remove 'id' field if present in req.body to avoid duplicate key error
    const { id, ...adData } = req.body;

    const ad = await Ad.create({
      ...adData,
      images: imageUrls,
      seller: req.user?.id,
      posted: new Date()
    });
    res.status(201).json(ad);
  } catch (err) {
    console.error("[POST] /api/ads/postAdd - Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllAds = async (req, res) => {
  try {
    console.log("Fetching ads for userId:", req.params.userId);
    let ads = []
     ads = await Ad.find().populate([{ path: "seller", select: "name email" }, { path: "category", select: "name description" }]).sort({ createdAt: -1 });

    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getUserAds = async (req, res) => {
  try {
    let userId = req.body.id;
    console.log("Fetching ads for userId:", req.params.id);
    let ads = []
     ads = await Ad.find({ seller: userId }).populate([{ path: "seller", select: "name email" }, { path: "category", select: "name description" }]).sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllAdCategories = async (req, res) => {
  try {
    console.log("Fetching all ad categories");
    const categories = await AdCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getAdById = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id).populate([{ path: "seller", select: "name email" }, { path: "category", select: "name" }]);
    if (!ad) return res.status(404).json({ message: "Ad not found" });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    if (ad.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    await ad.deleteOne();
    res.json({ message: "Ad deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
