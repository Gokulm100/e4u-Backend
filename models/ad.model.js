import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true },
        title: { type: String, required: true },
        price: { type: Number, required: true },
        location: { type: String, required: true },
        category: { type: String, required: true },
        image: { type: String, required: true },
        description: { type: String, required: true },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        posted: { type: Date, required: true }
    },
    { timestamps: true }
);

export default mongoose.model("Ad", adSchema);
