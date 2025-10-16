import Ad from "../models/ad.model.js";

export const createAd = async (req, res) => {
  try {
    const ad = await Ad.create({ ...req.body, userId: req.user.id });
    res.status(201).json(ad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllAds = async (req, res) => {
  try {
    const ads = await Ad.find().populate("userId", "name email");
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAdById = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id).populate("userId", "name email");
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
