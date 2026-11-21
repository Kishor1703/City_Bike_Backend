
const express = require("express");
const mongoose = require("mongoose");
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");
const User = require("../models/User");
const requireFirebaseAuth = require("../middleware/requireFirebaseAuth");

const router = express.Router();

// Create a booking
router.post("/", requireFirebaseAuth, async (req, res) => {
  if (!req.firebaseUser.email_verified) {
    return res.status(403).json({ message: "Verify your email before booking a ride." });
  }
  const { rideId, passengerName, seatsBooked, pickupLocation } = req.body;

  if (
    !mongoose.isValidObjectId(rideId) ||
    typeof passengerName !== "string" ||
    !passengerName.trim() ||
    typeof pickupLocation !== "string" ||
    !pickupLocation.trim() ||
    pickupLocation.trim().length > 200 ||
    !Number.isInteger(seatsBooked) ||
    seatsBooked < 1 ||
    seatsBooked > 2
  ) {
    return res.status(400).json({
      message: "Provide a valid ride, passenger name and seat count (1–2).",
    });
  }

  const passengerProfile = await User.findOne({ firebaseUid: req.firebaseUser.uid });
  if (!passengerProfile?.mobile) {
    return res.status(400).json({ message: "Add a mobile number to your profile before booking." });
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

      if (ride.riderUid && ride.riderUid === req.firebaseUser.uid) {
        const error = new Error("You cannot book your own ride.");
        error.status = 403;
        throw error;
      }

      booking = new Booking({
        ride: ride._id,
        passengerUid: req.firebaseUser.uid,
        passengerEmail: req.firebaseUser.email.toLowerCase(),
        passengerMobile: passengerProfile.mobile,
        passengerName: passengerName.trim(),
        pickupLocation: pickupLocation.trim(),
        seatsBooked,
        totalPrice: ride.pricePerSeat * seatsBooked,
        status: "confirmed",
      });

      await booking.save({ session });
    });

    let emailSent = false;
    let emailNotice = "";
    const bookedRide = await Ride.findById(booking.ride);
    if (bookedRide?.riderEmail) {
      try {
        await sendBookingEmail({
          to: bookedRide.riderEmail,
          riderName: bookedRide.riderName,
          passengerName: booking.passengerName,
          passengerMobile: booking.passengerMobile,
          pickupLocation: booking.pickupLocation,
          route: `${bookedRide.pickup} to ${bookedRide.destination}`,
          date: bookedRide.date,
          time: bookedRide.time,
        });
        emailSent = true;
      } catch (error) {
        console.error("Booking email failed:", error.message);
        emailNotice = "Booking is confirmed, but the rider email could not be sent.";
      }
    } else {
      emailNotice = "Booking is confirmed. The rider has no email on this ride, so no notification was sent.";
    }

    return res.status(201).json({
      message: "Seat booked successfully.",
      booking,
      emailSent,
      emailNotice,
    });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ message: error.message });
    }
    if (error.status === 403) {
      return res.status(403).json({ message: error.message });
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

// Personal booking history; never expose another passenger's details.
router.get("/mine", requireFirebaseAuth, async (req, res) => {
  try {
    if (!req.firebaseUser.email_verified) {
      return res.status(403).json({ message: "Verify your email before viewing bookings." });
    }
    const bookings = await Booking.find({ passengerUid: req.firebaseUser.uid })
      .populate("ride")
      .sort({ createdAt: -1 });

    res.json({ count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ message: "Could not retrieve bookings." });
  }
});

async function sendBookingEmail({
  to,
  riderName,
  passengerName,
  passengerMobile,
  pickupLocation,
  route,
  date,
  time,
}) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_APP_PASSWORD;
  if (!smtpUser || !smtpPassword) {
    throw new Error("SMTP_USER and SMTP_APP_PASSWORD are not configured");
  }

  const escapeHtml = (value) =>
    String(value).replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[char]);
  const text = [
    `Hi ${riderName},`,
    "A passenger booked a seat on your CityBike ride.",
    `Passenger: ${passengerName}`,
    `Mobile: ${passengerMobile}`,
    `Pickup point: ${pickupLocation}`,
    `Route: ${route}`,
    `Date and time: ${date} at ${time}`,
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(riderName)},</p><p>A passenger booked a seat on your CityBike ride.</p><ul><li><strong>Passenger:</strong> ${escapeHtml(passengerName)}</li><li><strong>Mobile:</strong> ${escapeHtml(passengerMobile)}</li><li><strong>Pickup point:</strong> ${escapeHtml(pickupLocation)}</li><li><strong>Route:</strong> ${escapeHtml(route)}</li><li><strong>Date and time:</strong> ${escapeHtml(date)} at ${escapeHtml(time)}</li></ul>`;

  const nodemailer = require("nodemailer");
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL || smtpUser,
    to,
    subject: "A passenger booked your CityBike ride",
    text,
    html,
  });
}

module.exports = router;
