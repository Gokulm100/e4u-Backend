import Location from "../models/locations.model.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Parse a free-text location ("Locality, City") into structured parts.
const parseLocation = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return null;

  const segments = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;

  const locality = segments[0];
  const city = segments.length > 1 ? segments[segments.length - 1] : segments[0];
  return { locality, city };
};

const ciExact = (value) => new RegExp(`^${escapeRegex(String(value).trim())}$`, "i");

/**
 * Add a fully-structured location (from the "new location" UI prompt). If a
 * matching locality+city already exists it's returned as-is; otherwise a new
 * user-sourced entry is created. Returns the location document.
 */
export async function upsertStructuredLocation({ state, district, city, locality }) {
  const existing = await Location.findOne({
    locality: ciExact(locality),
    city: ciExact(city),
  });

  if (existing) return existing;

  return Location.create({
    state: String(state).trim(),
    district: String(district).trim(),
    city: String(city).trim(),
    locality: String(locality).trim(),
    subLocations: [],
    source: "user",
    usageCount: 0,
  });
}

/**
 * Self-growing locations: if the supplied location text isn't already in the
 * DB, add it (marked as user-sourced). If it exists, bump its usage count.
 * Fire-and-forget — never throws into the caller.
 */
export async function ensureLocationExists(rawLocation) {
  try {
    const parsed = parseLocation(rawLocation);
    if (!parsed) return;

    const { locality, city } = parsed;

    const existing = await Location.findOne({
      locality: ciExact(locality),
      city: ciExact(city),
    });

    if (existing) {
      await Location.updateOne({ _id: existing._id }, { $inc: { usageCount: 1 } });
      return;
    }

    await Location.create({
      city,
      locality,
      source: "user",
      usageCount: 1,
    });
  } catch (err) {
    console.error("ensureLocationExists failed:", err?.message || err);
  }
}
