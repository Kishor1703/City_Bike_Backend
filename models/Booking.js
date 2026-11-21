
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    passengerUid: { type: String, index: true },
    passengerEmail: { type: String, trim: true, lowercase: true },
    passengerMobile: { type: String, trim: true },
    pickupLocation: { type: String, required: true, trim: true, maxlength: 200 },
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      index: true,
    },
    passengerName: {
      type: String,
      required: true,
      trim: true,
    },
    seatsBooked: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
