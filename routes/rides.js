const express = require("express");
const Ride = require("../models/Ride");

const router = express.Router();

// Offer a ride
router.post("/", async (req, res) => {
  try {
    const {
      riderName,
      pickup,
      destination,
      date,
      time,
      totalSeats,
      pricePerSeat,
    } = req.body;

    if (
      !riderName?.trim() ||
      !pickup?.trim() ||
      !destination?.trim() ||
      !date ||
      !time ||
      totalSeats == null ||
      pricePerSeat == null
    ) {
      return res.status(400).json({
        message: "Please provide all required ride details.",
      });
    }

    if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) {
      return res.status(400).json({
        message: "Pickup and destination must be different.",
      });
    }

    if (
      !Number.isInteger(Number(totalSeats)) ||
      Number(totalSeats) < 1 ||
      Number(totalSeats) > 2 ||
      !Number.isFinite(Number(pricePerSeat)) ||
      Number(pricePerSeat) < 0
    ) {
      return res.status(400).json({
        message: "Invalid seat count or price.",
      });
    }

    const ride = await Ride.create({
      riderName: riderName.trim(),
      pickup: pickup.trim(),
      destination: destination.trim(),
      date,
      time,
      totalSeats: Number(totalSeats),
      availableSeats: Number(totalSeats),
      pricePerSeat: Number(pricePerSeat),
    });

    res.status(201).json({
      message: "Ride offered successfully.",
      ride,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not create ride." });
  }
});

// Search for rides
router.get("/search", async (req, res) => {
  try {
    const { pickup, destination, date } = req.query;

    if (!pickup || !destination || !date) {
      return res.status(400).json({
        message: "Pickup, destination and date are required.",
      });
    }

    const rides = await Ride.find({
      pickup: { $regex: `^${escapeRegex(pickup.trim())}$`, $options: "i" },
      destination: {
        $regex: `^${escapeRegex(destination.trim())}$`,
        $options: "i",
      },
      date,
      availableSeats: { $gt: 0 },
    }).sort({ time: 1 });

    res.json({
      count: rides.length,
      rides,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not search for rides." });
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = router;