const mongoose = require("mongoose");

const gullakHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomerAuth",
    required: true
  },
  type: {
    type: String,
    enum: ["EARNED", "REDEEMED"],
    required: true
  },
  coins: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  validTill: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("GullakHistory", gullakHistorySchema);
