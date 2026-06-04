import mongoose from "mongoose";

const reportReasonSchema = new mongoose.Schema({
    reason: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("ReportReason", reportReasonSchema);
