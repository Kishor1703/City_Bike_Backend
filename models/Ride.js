const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    riderUid: { type: String, index: true },
    riderEmail: { type: String, trim: true, lowercase: true },
    riderMobile: { type: String, trim: true },
    riderName: {
      type: String,
      required: true,
      trim: true,
    },
    pickup: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerSeat: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);
