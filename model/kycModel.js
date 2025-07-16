const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UsersAuth",
      required: true,
      unique: true
    },
    panImage: {
      type: String, // S3/File path/URL to PAN image
      required: true
    },
    gstImage: {
      type: String, // Optional GST image
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("KYC", kycSchema);
