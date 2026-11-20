const mongoose = require("mongoose");

const firebaseUserSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    mobileVerified: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "firebase_users" }
);

module.exports = mongoose.model("FirebaseUser", firebaseUserSchema);
