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
export const getUserMessages = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user?.id);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }


    // Find messages between the two users for the specified ad
    const messages = await Chat.find({
      to: currentUserId,
      seenAt: null
    })
      .populate([{ path: "from", select: "name email" }, { path: "to", select: "name email" }])
      .sort({ createdAt: 1 });

    const count = await Chat.countDocuments({
      to: currentUserId,
      seenAt: null
    });

    res.json({ messages, count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getChats = async (req, res) => {
  try {
    const { adId, buyerId, sellerId } = req.query;
    if (!adId || !buyerId || !sellerId) {
      return res.status(400).json({ message: "adId, buyerId, and sellerId are required" });
    }
    console.log("Fetching chats for adId:", adId, "and buyerId:", buyerId, "and sellerId:", sellerId);
    // Convert adId and userId to ObjectId
    let adObjectId, buyerObjectId, sellerObjectId;
    try {
      adObjectId = new mongoose.Types.ObjectId(adId);
      buyerObjectId = new mongoose.Types.ObjectId(buyerId);
      sellerObjectId = new mongoose.Types.ObjectId(sellerId);
      console.log("Converted adId and userId to ObjectId:", adObjectId, buyerObjectId, sellerObjectId);
    } catch (e) {
      return res.status(400).json({ message: "Invalid adId or userId format" });
    }
    // Find chats for this ad where user is either sender or receiver
    const chats = await Chat.find({
      adId: adObjectId,
      $or: [ { to: buyerObjectId }, { from: sellerObjectId }, { from: buyerObjectId, to: sellerObjectId } ]
    }).populate([{ path: "from", select: "name email" }, { path: "to", select: "name email" }]).sort({ createdAt: 1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getSellingMessages = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user?.id);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Find messages sent by the current user
    // Aggregate latest message per person for each ad and user
    // Aggregate latest messages for ads where current user is the seller,
    // and group by buyer (i.e., messages between seller and buyers for each ad)
    const messages = await Chat.aggregate([
      {
      $match: {
        // Only messages related to ads where current user is the seller
        adId: { $in: await Ad.find({ seller: currentUserId }).distinct('_id') }
      }
      },
      {
      $sort: { createdAt: -1 }
      },
      {
      $group: {
        _id: { adId: "$adId", buyer: { $cond: [ { $eq: ["$from", currentUserId] }, "$to", "$from" ] } },
        message: { $first: "$message" },
        createdAt: { $first: "$createdAt" },
        from: { $first: "$from" },
        to: { $first: "$to" },
        adId: { $first: "$adId" }
      }
      },
      {
      $project: {
        adId: 1,
        buyer: "$_id.buyer",
        message: 1,
        createdAt: 1,
        from: 1,
        to: 1,
        _id: 0
      }
      }
    ]);
    // Populate user and ad info
    const populatedMessages = await Chat.populate(messages, [
      { path: "from", select: "name email" },
      { path: "to", select: "name email" },
      { path: "adId", model: "Ad", match: { seller: currentUserId }, select: "title seller" }
    ]);

    // Filter out messages where adId is null (i.e., ad seller is not current user)
    const filteredMessages = populatedMessages
      .filter(msg => msg.adId)
      .map((msg, idx) => ({
      id: idx + 1,
      adId: msg.adId?._id || '',
      buyerId: (msg.to?._id?.toString() === msg.adId?.seller?.toString()) ? msg.from?._id?.toString() : msg.to?._id?.toString(),
      sellerId: msg.adId?.seller?.toString() || '',
      buyerName: (msg.to?._id?.toString() === currentUserId.toString())
        ? (msg.from?.name || '')
        : (msg.to?.name || ''),
      item: msg.adId?.title || '',
      lastMessage: msg.message,
      time: msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '',
      avatar: msg.to?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg'
      }));
    const count = filteredMessages.length;
    res.json({ filteredMessages, count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API to fetch buying messages (messages on ads posted by others where current user initiated a conversation)
export const getBuyingMessages = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user?.id);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Find ads NOT posted by current user
    const otherAds = await Ad.find({ seller: { $ne: currentUserId } }).distinct('_id');
    // Aggregate latest messages for ads where current user is the buyer (initiator)
    const messages = await Chat.aggregate([
      {
        $match: {
          adId: { $in: otherAds },
          from: currentUserId
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: { adId: "$adId", seller: "$to" },
          message: { $first: "$message" },
          createdAt: { $first: "$createdAt" },
          from: { $first: "$from" },
          to: { $first: "$to" },
          adId: { $first: "$adId" }
        }
      },
      {
        $project: {
          adId: 1,
          seller: "$_id.seller",
          message: 1,
          createdAt: 1,
          from: 1,
          to: 1,
          _id: 0
        }
      }
    ]);
    // Populate user and ad info
    const populatedMessages = await Chat.populate(messages, [
      { path: "from", select: "name email" },
      { path: "to", select: "name email" },
      { path: "adId", model: "Ad", select: "title seller" }
    ]);

    // Filter out messages where adId is null (shouldn't happen, but for safety)
    const filteredMessages = populatedMessages
      .filter(msg => msg.adId)
      .map((msg, idx) => ({
        id: idx + 1,
        adId: msg.adId?._id || '',
        sellerName: msg.to?.name || '',

        buyerId: (msg.to?._id?.toString() === msg.adId?.seller?.toString()) ? msg.from?._id?.toString() : msg.to?._id?.toString(),
        sellerId: msg.adId?.seller?.toString() || '',
        item: msg.adId?.title || '',
        lastMessage: msg.message,
        time: msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '',
        avatar: msg.to?.avatar || 'https://randomuser.me/api/portraits/men/2.jpg'
      }));
    const count = filteredMessages.length;
    res.json({ filteredMessages, count });
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
    // console.log("[PUT] /api/ads/edit/:id - Body:", req.body);
    const adId = req.params.id;
    // Collect update data
    const updateData = { ...req.body };
    // If new images are uploaded, handle them
    console.log("Updating ad with files:", adId, "with data:", req.files);
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
    // Pagination params
    const page = parseInt(req.body.page, 10) || 1;
    const limit = parseInt(req.body.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.body.search || '';

    // Total count for pagination
    const total = await Ad.countDocuments({ title: { $regex: searchQuery, $options: 'i' } });

    // Fetch paginated ads
    const ads = await Ad.find({ title: { $regex: searchQuery, $options: 'i' } ,seller: { $ne: req.user?.id } })
      .populate([
        { path: "seller", select: "name email" },
        { path: "category", select: "name description" }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      ads,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getUserAds = async (req, res) => {
  try {
    const userId = req.body.id;
    const page = parseInt(req.body.page, 10) || 1;
    const limit = parseInt(req.body.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Total count for pagination
    const total = await Ad.countDocuments({ seller: userId });

    // Fetch paginated ads for user
    const ads = await Ad.find({ seller: userId })
      .populate([
        { path: "seller", select: "name email" },
        { path: "category", select: "name description" }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      ads,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
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
