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
import Ad from "../models/ad.model.js";
import AdCategory from "../models/ad.category.model.js";
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
