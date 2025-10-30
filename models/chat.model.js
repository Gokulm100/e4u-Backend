import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    adId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

}, {
    timestamps: true
});

export default mongoose.model("Chat", chatSchema);
