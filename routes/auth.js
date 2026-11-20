const express = require("express");
const User = require("../models/User");
const requireFirebaseAuth = require("../middleware/requireFirebaseAuth");

const router = express.Router();

function validMobile(value) {
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
}

router.post("/profile", requireFirebaseAuth, async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const mobile = typeof req.body.mobile === "string" ? req.body.mobile.trim() : "";
    const email = req.firebaseUser.email;
    if (!name || name.length > 80 || !validMobile(mobile) || !email) {
      return res.status(400).json({
        message: "A name, valid email, and mobile number in international format are required.",
      });
    }

    const verifiedPhone = req.firebaseUser.phone_number;
    if (verifiedPhone && verifiedPhone !== mobile) {
      return res.status(400).json({
        message: "The mobile number must match the number verified with Firebase.",
      });
    }

    const profileUpdate = {
      firebaseUid: req.firebaseUser.uid,
      name,
      email: email.toLowerCase(),
      emailVerified: Boolean(req.firebaseUser.email_verified),
    };
    if (verifiedPhone === mobile) {
      profileUpdate.mobile = mobile;
      profileUpdate.mobileVerified = true;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.firebaseUser.uid },
      profileUpdate,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
    return res.json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That mobile number is already on another account." });
    }
    console.error("Profile save failed:", error.message);
    return res.status(500).json({ message: "Could not save your profile." });
  }
});

router.get("/profile", requireFirebaseAuth, async (req, res) => {
  try {
    if (!req.firebaseUser.email_verified) {
      return res.status(403).json({ message: "Verify your email before opening your profile." });
    }
    let user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user && req.firebaseUser.email) {
      user = {
        firebaseUid: req.firebaseUser.uid,
        name: req.firebaseUser.name || "",
        email: req.firebaseUser.email,
        mobile: "",
        emailVerified: true,
        mobileVerified: false,
      };
    }
    if (!user) return res.status(404).json({ message: "Profile not found." });
    if (user.save && req.firebaseUser.email_verified && !user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Profile load failed:", error.message);
    return res.status(500).json({ message: "Could not load your profile." });
  }
});

function publicUser(user) {
  return {
    id: user.firebaseUid,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    emailVerified: Boolean(user.emailVerified),
    mobileVerified: Boolean(user.mobileVerified),
  };
}

module.exports = router;
