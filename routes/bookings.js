
const express = require("express");
const mongoose = require("mongoose");
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");

const router = express.Router();

// Create a booking
router.post("/", async (req, res) => {
  const { rideId, passengerName, seatsBooked } = req.body;

  if (
    !mongoose.isValidObjectId(rideId) ||
    typeof passengerName !== "string" ||
    !passengerName.trim() ||
    !Number.isInteger(seatsBooked) ||
    seatsBooked < 1 ||
    seatsBooked > 2
  ) {
    return res.status(400).json({
      message: "Provide a valid ride, passenger name and seat count (1–2).",
    });
  }

  const session = await mongoose.startSession();

  try {
    let booking;

    await session.withTransaction(async () => {
      // Reserve seats only if enough are still available.
      const ride = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          availableSeats: { $gte: seatsBooked },
        },
        {
          $inc: { availableSeats: -seatsBooked },
        },
        {
          new: true,
          session,
        }
      );

      if (!ride) {
        const error = new Error(
          "Ride not found or not enough seats are available."
        );
        error.status = 409;
        throw error;
      }

      booking = new Booking({
        ride: ride._id,
        passengerName: passengerName.trim(),
        seatsBooked,
        totalPrice: ride.pricePerSeat * seatsBooked,
        status: "confirmed",
      });

      await booking.save({ session });
    });

    return res.status(201).json({
      message: "Seat booked successfully.",
      booking,
    });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ message: error.message });
    }

    console.error("Booking error:", error.message);

    return res.status(500).json({
      message:
        "Could not create booking. Check that MongoDB supports transactions.",
    });
  } finally {
    await session.endSession();
  }
});

// Get bookings (development testing only)
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("ride")
      .sort({ createdAt: -1 });

    res.json({ count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ message: "Could not retrieve bookings." });
  }
});

module.exports = router;
