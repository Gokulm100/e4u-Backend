import Chat from "../models/chat.model.js";
import Ad from "../models/ad.model.js";
import User from "../models/user.model.js";
import AdCategory from "../models/ad.category.model.js";
import {analyzeDescription,aiSearchAds,analyzeChatForFraud} from "../aiAnalyzer/aiAnalyzer.js";
import { sendChatNotification } from "../services/pushService.js";
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

    // Aggregate to get the latest unseen message from each sender to the current user
    const latestMessages = await Chat.aggregate([
      {
        $match: {
          to: currentUserId,
          seenAt: null
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$from",
          message: { $first: "$message" },
          createdAt: { $first: "$createdAt" },
          from: { $first: "$from" },
          to: { $first: "$to" },
          adId: { $first: "$adId" },
          seenAt: { $first: "$seenAt" }
        }
      },
      {
        $project: {
          _id: 0,
          from: 1,
          to: 1,
          adId: 1,
          message: 1,
          createdAt: 1,
          seenAt: 1
        }
      }
    ]);

    // Populate user info
    const populated = await Chat.populate(latestMessages, [
      { path: "from", select: "name email" },
      { path: "to", select: "name email" }
    ]);

    res.json({ messages: populated, count: populated.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getChats = async (req, res) => {
  try {
    let currentUser = req.user?.name;
    const { adId, buyerId, sellerId } = req.query;
    if (!adId || !buyerId || !sellerId) {
      return res.status(400).json({ message: "adId, buyerId, and sellerId are required" });
    }
    
    let adObjectId, buyerObjectId, sellerObjectId;
    try {
      adObjectId = new mongoose.Types.ObjectId(adId);
      buyerObjectId = new mongoose.Types.ObjectId(buyerId);
      sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    } catch (e) {
      return res.status(400).json({ message: "Invalid adId or userId format" });
    }
    
    // Find chats between buyer and seller for this specific ad
    const chats = await Chat.find({
      adId: adObjectId,
      $or: [
        { from: buyerObjectId, to: sellerObjectId },
        { from: sellerObjectId, to: buyerObjectId }
      ]
    })
    .populate([
      { path: "from", select: "name email" },
      { path: "to", select: "name email" }
    ])
    .sort({ createdAt: 1 });
    console.log(currentUser)
    const filteredChats = chats.filter(chat => chat.from.name !== currentUser);
    const fraudCheck = await analyzeChatForFraud(filteredChats);
    res.json({ chats, fraudCheck });
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
    // Get all ad IDs where current user is the seller
    const adIds = await Ad.find({ seller: currentUserId }).distinct('_id');

    const messages = await Chat.aggregate([
      {
      $match: {
        adId: { $in: adIds }
      }
      },
      {
      $sort: { createdAt: -1, _id: -1 } // Ensure deterministic sort
      },
      {
      $group: {
        _id: { adId: "$adId", buyer: { $cond: [ { $eq: ["$from", currentUserId] }, "$to", "$from" ] } },
        message: { $first: "$message" },
        createdAt: { $first: "$createdAt" },
        seenAt: { $first: "$seenAt" },
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
        seenAt: 1,
        from: 1,
        to: 1,
        _id: 0
      }
      },
      {
      $sort: { createdAt: -1, adId: 1, buyer: 1 } // Final sort for consistent order
      }
    ]);
    // console.log(messages)
    // res.json({ messages, count: messages.length });

    // Populate user and ad info
    const populatedMessages = await Chat.populate(messages, [
      { path: "from", select: "name email" },
      { path: "to", select: "name email" },
      { path: "adId", model: "Ad", match: { seller: currentUserId }, select: "title seller" }
    ]);
    console.log("populatedMessages", populatedMessages)
    // Filter out messages where adId is null (i.e., ad seller is not current user)
    const filteredMessages = populatedMessages
      .filter(msg => msg.adId)
      .map((msg, idx) => {
      // Helper to format date as "18 JAN 2025 10:02 AM"
    

      return {
        id: idx + 1,
        adId: msg.adId?._id || '',
        buyerId: (msg.to?._id?.toString() === msg.adId?.seller?.toString()) ? msg.from?._id?.toString() : msg.to?._id?.toString(),
        sellerId: msg.adId?.seller?.toString() || '',
        buyerName: (msg.to?._id?.toString() === currentUserId.toString())
        ? (msg.from?.name || '')
        : (msg.to?.name || ''),
        item: msg.adId?.title || '',
        lastMessage: msg.message,
        isSeen: msg.seenAt ? true : false,
        lastMessageFrom: msg.from?._id?.toString(),
        seenAt: msg.seenAt ? formatDate(msg.seenAt) : '',
        time: msg.createdAt ? formatDate(msg.createdAt) : '',
        avatar: msg.to?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg'
      };
      });
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
        $or: [
        { from: currentUserId },
        { to: currentUserId }
        ]
      }
      },
      {
      $sort: { createdAt: -1 }
      },
      {
      $group: {
        _id: {
        adId: "$adId",
        seller: {
          $cond: [
          { $eq: ["$from", currentUserId] },
          "$to",
          "$from"
          ]
        }
        },
        message: { $first: "$message" },
        createdAt: { $first: "$createdAt" },
        seenAt: { $first: "$seenAt" },
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
        seenAt: 1,
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
        lastMessageFrom: msg.from?._id?.toString(),
        buyerName: (msg.to?._id?.toString() === currentUserId.toString())
          ? (msg.from?.name || '')
          : (msg.to?.name || ''),

        buyerId: (msg.to?._id?.toString() === msg.adId?.seller?.toString()) ? msg.from?._id?.toString() : msg.to?._id?.toString(),
        sellerId: msg.adId?.seller?.toString() || '',
        item: msg.adId?.title || '',
        lastMessage: msg.message,
        isSeen: msg.seenAt ? true : false,
        seenAt: msg.seenAt ? formatDate(msg.seenAt) : '',
        time: msg.createdAt ? formatDate(msg.createdAt) : '',
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

    // Create chat message
    const chat = await Chat.create({ adId, message, to, from });

    // Add sender to usersInterested if not the seller
    const ad = await Ad.findById(adId).select("seller usersInterested");
    if (ad && ad.seller.toString() !== from.toString()) {
      if (!ad.usersInterested.includes(from)) {
        ad.usersInterested.push(from);
        await ad.save();
      }
    }

    // Send push notification to recipient if possible
    User.findById(to).select("fcmToken").then(receiver => {
      if (receiver?.fcmToken) {
        console.log(req.user)
        const fromName = req.user?.name || "Someone";
        sendChatNotification(receiver.fcmToken, message, fromName).catch(console.error);
      }
    }).catch(console.error);

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
    const categoryName = req.body.category || null;
    const subCategory = req.body.subCategory || null;
    const userId = req.body?.userId || null;
    const aiSearch = req.body?.aiSearch || false;
    console.log(userId)
    let filter = {};
    // Resolve category name to ObjectId if provided
    let categoryId = null;
    if (categoryName) {
      const categoryDoc = await AdCategory.findOne({ name: categoryName });
      if (categoryDoc) {
        categoryId = categoryDoc._id;
      }
    }
    if(!aiSearch){
        // Build filter
        filter = {
          title: { $regex: searchQuery, $options: 'i' }
        };
    }

    if (categoryId) {
      filter.category = categoryId;
    }
    if (subCategory) {
      filter.subCategory = subCategory;
    }
    // Add seller filter if user is authenticated
    if (userId) {
      filter.seller = { $ne: userId };
    }
    filter.isSold = false;
    filter.isActive = true;
    // Total count with same filter
    const total = await Ad.countDocuments(filter);

    // Fetch paginated ads with same filter
    let ads;
    if (aiSearch) {
      ads = await Ad.find(filter)
      .populate([
        { path: "seller", select: "name email" },
        { path: "category", select: "name description" }
      ])
      .sort({ createdAt: -1, _id: -1 });
    } else {
      ads = await Ad.find(filter)
      .populate([
        { path: "seller", select: "name email" },
        { path: "category", select: "name description" }
      ])
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);
    }
      console.log("Ads fetched:", ads.length);
    if (aiSearch && searchQuery) {
      let aiOptimizedResult = []
       aiOptimizedResult = ads.map(ad => ({
        _id: ad._id,
        title: ad.title,
        description: ad.description,
        price: ad.price,
        location: ad.location,
        category: ad.category,
        subCategory: ad.subCategory,
        images: ad.images,
        views: ad.views,
        createdAt: ad.createdAt

        }))
        console.log("AI Optimized Result:", aiOptimizedResult);

      const aiResult = await aiSearchAds({
        aiOptimizedResult,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }, searchQuery);
      aiResult.limit = limit;
      aiResult.page = page;
      aiResult.totalPages = Math.ceil(aiResult.total / limit);
      res.json(aiResult);
    } else {
      res.json({
        ads,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    }

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
export const summarizeAdUsingAi = async (req, res) => {
  try {
    const { adTitle, category, subCategory, description } = req.body;

    // Validation
    if (!description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Description and category are required'
      });
    }

    if (description.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Description is too short for analysis'
      });
    }

    // Generate AI summary
    console.log('🤖 Analyzing description...');

    const aiSummary = await analyzeDescription({
      adTitle,
      category,
      subCategory,
      description
    });

    console.log('✅ AI summary generated successfully');

    return res.json({
      success: true,
      data: aiSummary
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate AI summary',
      message: error.message
    });
  }
};
export const markMessagesAsSeen = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user?.id);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("Marking messages as seen for user:", req.user);
    const { adId, reader, sender } = req.body;
    if (!adId) {
      return res.status(400).json({ message: "adId is required" });
    }
        if (reader == sender) {
      return res.status(400).json({ message: "Reader and sender cannot be the same" });
    }
    // Update messages to set seenAt timestamp
    const result = await Chat.updateMany(
      { from: sender,
        to: reader,
        adId: new mongoose.Types.ObjectId(adId)
      },
      {
        $set: { seenAt: new Date() }
      }
    );

    return res.json({ message: "Messages marked as seen", result });
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const incrementViews = async (req, res) => {
  try {
    const { adId } = req.body;
    if (!adId) {
      return res.status(400).json({ message: "adId is required" });
    }
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    ad.views = (ad.views || 0) + 1;
    await ad.save();
    return res.json({ message: "View count incremented", views: ad.views });
  } catch (error) {
    console.error("Error counting views:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
export const getUsersInterestedInAd = async (req, res) => {
  try {
    const { adId } = req.body;
    if (!adId) {
      return res.status(400).json({ message: "adId is required" });
    }

    const ad = await Ad.findById(adId).populate([{ path: "usersInterested", select: "name email" }]);
    const users = ad ? ad.usersInterested : [];

    res.json({ users });
  } catch (err) {
    console.error("Error fetching interested users:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const markAdAsSold = async (req, res) => {
  try {
    const { adId, buyerId } = req.body;
    if (!adId ) {
      return res.status(400).json({ message: "adId is required" });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    ad.isSold = true;
    ad.soldTo = buyerId || null;
    await ad.save();

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error marking ad as sold:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
export const disableAd = async (req, res) => {
  try {
    const { adId } = req.body;
    if (!adId ) {
      return res.status(400).json({ message: "adId is required" });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    ad.isActive = false;
    await ad.save();

    return res.json({ message: "Ad disabled successfully" });
  } catch (error) {
    console.error("Error disabling ad:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
export const enableAd = async (req, res) => {
  try {
    const { adId } = req.body;
    if (!adId ) {
      return res.status(400).json({ message: "adId is required" });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    ad.isActive = true;
    await ad.save();

    return res.json({ message: "Ad enabled successfully" });
  } catch (error) {
    console.error("Error enabling ad:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
  const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = `${hours}:${minutes} ${ampm}`;

        if (isToday) return `Today ${timeStr}`;
        if (isYesterday) return `Yesterday ${timeStr}`;

        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = d.getFullYear();
        return `${day} ${month} ${year} ${timeStr}`;
      };