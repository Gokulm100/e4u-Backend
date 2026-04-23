import User from "../models/user.model.js";
import ConsentVersion from "../models/consentVersion.model.js";
import Location from "../models/locations.model.js";
import Consent from "../models/consent.model.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerUser = async (req, res) => {
  try {
    console.log("Register route hit");
    console.log("Incoming registration request:", req.body);
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password });
    res.status(201).json({ message: "User registered", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { token } = req.body; // Google ID token from frontend
    if (!token) return res.status(400).json({ message: "Token is required" });

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, name, email, picture } = payload;

    // Find or create user
    let user = await User.findOne({ googleId: sub });
    if (!user) {
      user = await User.create({
        googleId: sub,
        name,
        email,
        profilePic: picture,
      });
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
    console.log("User logged in:", user);
    // Generate JWT for your app
    const appToken = jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token: appToken, user });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ message: "Invalid Google token" });
  }
};

export const saveFcmToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.fcmToken = fcmToken;
    console.log(user);
    await user.save();

    res.json({ message: "FCM token saved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getLatestConsentVersion = async (req, res) => {
  try {
    let latestVersionDoc = await ConsentVersion.findOne().sort({ version: -1 });
    if (!latestVersionDoc) {
      return res.status(404).json({ message: "No consent versions found" });
    }
    const data = {privacyNotice: latestVersionDoc.privacyNotice,termsOfService: latestVersionDoc.termsOfService,version: latestVersionDoc.version};
    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const acceptConsent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { version } = req.body;
    let data  = {}

    if (!version) {
      return res.status(400).json({ message: "Consent version is required" });
    }
    data.userId = userId;
    data.consentVersionId = version;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    let consentStatus = await Consent.create(data);
    if(consentStatus) {
      user.isConsented = true;
      await user.save();
    }

    res.json({ message: "Consent accepted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const revokeConsent = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.consentVersion = null; // Or set to a specific value indicating revocation
    user.isConsented = false;
    await user.save();

    res.json({ message: "Consent revoked successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const reportUser = async (req, res) => {
  try {
    const reportedUserId = req.body.userId;
    if (!reportedUserId) {
      return res.status(400).json({ message: "Reported user ID is required" });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: "Reported user not found" });
    }

    reportedUser.reportCounter += 1;
    if(reportedUser.reportCounter >= 5){
      reportedUser.isActive = false; // Deactivate user after 5 reports
      reportedUser.isBlocked = true;
    }
    await reportedUser.save();

    res.json({ message: "User reported successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
export const updateLocations = async (req, res) => {
  try {
    let primaryLocation = req.body.primaryLocation;
    if(!primaryLocation) {
      return res.status(400).json({ message: "Primary location is required" });
    }
    let subLocation= req.body.subLocation;
    let sublocations = req.body.sublocations;
    if(subLocation) {
      await Location.findOneAndUpdate(
        { name: primaryLocation },
        { $addToSet: { subLocations: subLocation } },
        { upsert: true, new: true }
      );
    }else 
    if(sublocations) {
      await Location.findOneAndUpdate(
        { name: primaryLocation },
        { $set: { subLocations: sublocations } },
        { upsert: true, new: true }
      );
    }
    res.json({ message: "Locations updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
export const getLocations = async (req, res) => {
  try {
    const locations = await Location.find();
    res.json({ data: locations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};