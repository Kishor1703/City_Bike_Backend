const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    zone: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "Chennai" },
    state: { type: String, trim: true, default: "Tamil Nadu" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);
