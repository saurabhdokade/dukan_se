// models/ReferralTransaction.js

const mongoose = require("mongoose");

const referralTransactionSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UsersAuth",
      required: true
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UsersAuth",
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      default: "Referral bonus"
    }
  },
  { timestamps: true } // createdAt = date of reward
);

module.exports = mongoose.model("ReferralTransaction", referralTransactionSchema);
