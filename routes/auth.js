const express = require("express");
const crypto = require("node:crypto");
const User = require("../models/User");
const Registration = require("../models/Registration");

const router = express.Router();
const CODE_LIFETIME_MS = 10 * 60 * 1000;
const CODE_SECRET = process.env.AUTH_CODE_SECRET;

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hash(value) {
  return crypto.createHash("sha256").update(`${CODE_SECRET}:${value}`).digest("hex");
}

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function passwordMatches(password, stored) {
  const [salt, digest] = stored.split(":");
  const actual = Buffer.from(passwordHash(password, salt).split(":")[1], "hex");
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function validMobile(value) {
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
}

async function sendEmailCode(email, code) {
  if (!process.env.RESEND_API_KEY || !process.env.AUTH_FROM_EMAIL) {
    throw new Error("Email verification is not configured. Set RESEND_API_KEY and AUTH_FROM_EMAIL.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_FROM_EMAIL,
      to: [email],
      subject: "Your CityBike verification code",
      text: `Your CityBike email verification code is ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!response.ok) throw new Error("Could not send the email verification code.");
}

async function sendMobileCode(mobile, code) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error("Mobile verification is not configured. Set the Twilio account, token, and sender number.");
  }
  const body = new URLSearchParams({
    To: mobile,
    From: TWILIO_FROM_NUMBER,
    Body: `Your CityBike mobile verification code is ${code}. It expires in 10 minutes.`,
  });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body }
  );
  if (!response.ok) throw new Error("Could not send the mobile verification code.");
}

router.post("/register/start", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body.email);
    const mobile = typeof req.body.mobile === "string" ? req.body.mobile.trim() : "";
    const password = req.body.password;
    if (!name || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || !validMobile(mobile) ||
        typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Enter your name, a valid email, a mobile number in international format (such as +919876543210), and a password with at least 8 characters." });
    }
    if (!CODE_SECRET) return res.status(503).json({ message: "Set AUTH_CODE_SECRET to enable account verification." });
    if (await User.exists({ $or: [{ email }, { mobile }] })) {
      return res.status(409).json({ message: "An account already exists with that email or mobile number." });
    }

    const emailCode = `${crypto.randomInt(0, 1000000)}`.padStart(6, "0");
    const mobileCode = `${crypto.randomInt(0, 1000000)}`.padStart(6, "0");
    const now = new Date();
    await Registration.findOneAndUpdate(
      { $or: [{ email }, { mobile }] },
      { name, email, mobile, passwordHash: passwordHash(password), emailCodeHash: hash(emailCode), mobileCodeHash: hash(mobileCode), expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS), attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Promise.all([sendEmailCode(email, emailCode), sendMobileCode(mobile, mobileCode)]);
    return res.status(200).json({ message: "Verification codes sent to your email and mobile." });
  } catch (error) {
    console.error("Registration start failed:", error.message);
    return res.status(503).json({ message: error.message || "Could not start registration." });
  }
});

router.post("/register/verify", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const emailCode = typeof req.body.emailCode === "string" ? req.body.emailCode.trim() : "";
    const mobileCode = typeof req.body.mobileCode === "string" ? req.body.mobileCode.trim() : "";
    const registration = await Registration.findOne({ email });
    if (!registration || registration.expiresAt <= new Date()) {
      return res.status(400).json({ message: "Verification expired. Please start registration again." });
    }
    if (registration.attempts >= 5) {
      await registration.deleteOne();
      return res.status(429).json({ message: "Too many incorrect attempts. Please start registration again." });
    }
    const emailValid = hash(emailCode) === registration.emailCodeHash;
    const mobileValid = hash(mobileCode) === registration.mobileCodeHash;
    if (!emailValid || !mobileValid) {
      registration.attempts += 1;
      await registration.save();
      return res.status(400).json({ message: "One or both verification codes are incorrect." });
    }

    const user = await User.create({
      name: registration.name,
      email: registration.email,
      mobile: registration.mobile,
      passwordHash: registration.passwordHash,
      emailVerified: true,
      mobileVerified: true,
    });
    await registration.deleteOne();
    return res.status(201).json({ message: "Your account is verified and ready.", user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile } });
  } catch (error) {
    console.error("Registration verification failed:", error.message);
    return res.status(500).json({ message: "Could not verify your account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Enter your email and password." });
    }
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !passwordMatches(password, user.passwordHash)) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    return res.json({ message: "Login successful.", user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile } });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ message: "Could not log in right now." });
  }
});

module.exports = router;
