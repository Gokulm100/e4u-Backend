import mongoose from "mongoose";

// Matches the live "locations" collection shape (seeded + user-grown).
// `strict: false` keeps any legacy fields (e.g. `name`) intact.
const locationSchema = new mongoose.Schema(
    {
        state: { type: String, trim: true },
        district: { type: String, trim: true },
        city: { type: String, trim: true },
        locality: { type: String, trim: true },
        subLocations: {
            type: [
                {
                    type: String,
                    trim: true
                }
            ],
            default: []
        },
        // Where the entry came from: "seed" (preloaded) or "user" (self-grown).
        source: { type: String, default: "seed" },
        // How many times this location has been used on an ad.
        usageCount: { type: Number, default: 0 }
    },
    { timestamps: true, strict: false, collection: "locations" }
);

// Speeds up the case-insensitive "does this location already exist?" lookup.
locationSchema.index({ locality: 1, city: 1 });

export default mongoose.model("Location", locationSchema);
