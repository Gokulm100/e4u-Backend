import mongoose from "mongoose";

export const REVIEW_TAGS = [
  "Responsive",
  "Item as described",
  "Fair price",
  "No-show",
  "Scam attempt",
];

export const REVIEW_EXPIRY_DAYS = 14;

const reviewSchema = new mongoose.Schema(
  {
    ad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["buyer", "seller"],
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    tags: [{ type: String }],
    text: {
      type: String,
      maxlength: 200,
      default: "",
    },
  },
  { timestamps: true, versionKey: false }
);

reviewSchema.index({ ad: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
