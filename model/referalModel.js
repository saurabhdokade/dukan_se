// models/Referral.js
const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomerAuth",
    required: true
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomerAuth",
    required: true
  },
  bonusAmount: {
    type: Number,
    default: 50
  },
  status: {
    type: String,
    enum: ["PENDING", "EARNED"],
    default: "PENDING"
  },
  earnedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("Referral", referralSchema);
