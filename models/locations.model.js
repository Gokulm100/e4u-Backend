import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        subLocations: {
            type: [
                {
                    type: String,
                    trim: true
                }
            ],
            default: []
        }
    },
    { timestamps: true }
);

export default mongoose.model("Location", locationSchema);