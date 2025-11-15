import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profilePic: {
      type: String, // URL to Google profile image
    },
    // Optional fields for future use
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    fcmToken: {
      type: String,
    },
  },
  { versionKey: false }
);

export default mongoose.model("User", userSchema);
