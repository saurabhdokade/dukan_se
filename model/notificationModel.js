const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "userType", // Can be CustomerAuth or UsersAuth
    required: true
  },
  userType: {
    type: String,
    enum: ["CustomerAuth", "UsersAuth"],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null
  },
  type: {
    type: String,
    enum: ["ORDER", "PAYMENT","COMPLAINT", "GULLAK", "CANCEL", "DELIVERY", "SYSTEM"],
    default: "ORDER"
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
