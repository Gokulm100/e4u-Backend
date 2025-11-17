import mongoose from "mongoose";

const consentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    consentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "ConsentVersion", required: true },
    givenAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model("Consent", consentSchema);