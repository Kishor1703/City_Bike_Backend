const express = require("express");
const Location = require("../models/Location");
const requireFirebaseAuth = require("../middleware/requireFirebaseAuth");
const defaultLocations = require("../data/chennai_citybike_areas.json");

const router = express.Router();
let seedPromise;

async function ensureDefaultLocations() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await Promise.all(defaultLocations.map((row) => Location.updateOne(
        { key: row.area_name.toLowerCase() },
        { $set: {
          name: row.area_name,
          zone: row.zone,
          city: row.city,
          state: row.state,
          isDefault: true,
        } },
        { upsert: true }
      )));
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function rememberLocation(name) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName || cleanName.length > 100) return;
  await Location.updateOne(
    { key: cleanName.toLowerCase() },
    { $setOnInsert: { name: cleanName, key: cleanName.toLowerCase(), city: "Chennai", state: "Tamil Nadu", isDefault: false } },
    { upsert: true }
  );
}

router.get("/", requireFirebaseAuth, async (req, res) => {
  try {
    if (!req.firebaseUser.email_verified) {
      return res.status(403).json({ message: "Verify your email before loading locations." });
    }
    await ensureDefaultLocations();
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const filter = query
      ? { name: { $regex: escapeRegex(query), $options: "i" } }
      : {};
    const locations = await Location.find(filter)
      .sort({ isDefault: -1, name: 1 })
      .limit(query ? 12 : 120)
      .select("name zone city state isDefault -_id");
    return res.json({ locations });
  } catch (error) {
    console.error("Location lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load locations." });
  }
});

router.post("/", requireFirebaseAuth, async (req, res) => {
  try {
    if (!req.firebaseUser.email_verified) {
      return res.status(403).json({ message: "Verify your email before saving locations." });
    }
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 100) {
      return res.status(400).json({ message: "Enter a location name up to 100 characters." });
    }
    await ensureDefaultLocations();
    await rememberLocation(name);
    const location = await Location.findOne({ key: name.toLowerCase() })
      .select("name zone city state isDefault -_id");
    return res.json({ location });
  } catch (error) {
    console.error("Location save failed:", error.message);
    return res.status(500).json({ message: "Could not save this location." });
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { router, rememberLocation };
