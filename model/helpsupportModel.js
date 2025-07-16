const mongoose = require("mongoose");

const helpSupportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAuth",
      required: true
    },
    faqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FAQ",
      required: true
    },
    ticketId: {
      type: String,
      unique: true,
      required: true
    },
    message: {
      type: String,
      required: false
    },
    status: {
      type: String,
      enum: ["PENDING", "RESOLVED", "CLOSED"],
      default: "PENDING"
    },
    response: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpSupport", helpSupportSchema);
