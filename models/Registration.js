const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    emailCodeHash: { type: String, required: true },
    mobileCodeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);
registrationSchema.index({ email: 1 }, { unique: true });
registrationSchema.index({ mobile: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
