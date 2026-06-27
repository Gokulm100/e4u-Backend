import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    adId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad',
        required: true
    },
    message: {
        type: String,
        default: ""
    },
    imageUrl: {
        type: String,
        default: null
    },
    seenAt: {
        type: Date,
        default: null
    },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

}, {
    timestamps: true
});

chatSchema.index({ to: 1, createdAt: -1 });
chatSchema.index({ adId: 1, from: 1, createdAt: 1 });

export default mongoose.model("Chat", chatSchema);
