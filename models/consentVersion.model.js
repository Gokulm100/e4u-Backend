import mongoose from "mongoose";

const consentVersionSchema = new mongoose.Schema({
    privacyNotice: { type: String, required: true, unique: true },
    termsOfService: { type: String, required: true },
    version: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model("ConsentVersion", consentVersionSchema);