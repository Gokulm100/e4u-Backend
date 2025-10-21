import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        price: { type: Number, required: true },
        location: { type: String, required: true },
        category: { type: mongoose.Schema.Types.ObjectId, ref: "AdCategory", required: true },
        images: [{ type: String, required: true }],
        description: { type: String, required: true },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        posted: { type: Date, required: true, default: Date.now }
    },
    { timestamps: true }
);

export default mongoose.model("Ad", adSchema);
