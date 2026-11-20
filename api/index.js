if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
let mongoConnection;

app.use(cors());
app.use(express.json());

app.get(["/", "/api/index.js"], (req, res) => {
  res.json({ message: "CityBike API is running!" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "CityBike API" });
});

async function connectToMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!mongoConnection) {
    mongoConnection = mongoose.connect(process.env.MONGODB_URI).catch((error) => {
      mongoConnection = null;
      throw error;
    });
  }

  await mongoConnection;
}

// Vercel invokes the exported handler for each request. Connect lazily so the
// function can reuse the MongoDB connection across warm invocations.
app.use(async (req, res, next) => {
  try {
    await connectToMongo();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).json({ message: "Database unavailable." });
  }
});

app.use("/api/rides", require("../routes/rides"));
app.use("/api/bookings", require("../routes/bookings"));
app.use("/api/auth", require("../routes/auth"));

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CityBike API running on port ${PORT}`);
  });
}

module.exports = app;
