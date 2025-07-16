const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const addressSchema = new mongoose.Schema({
  houseNumber: { type: String },
  roadName: { type: String },
  landMark: { type: String },
  city: { type: String },
  state: { type: String },
  pinCode: { type: String }
});

const locationSchema = new mongoose.Schema({
  useCurrentLocation: { type: Boolean, default: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  formattedAddress: { type: String },
  address: addressSchema
});

const shopSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true
    },
    gstinNumber: {
      type: String,
      trim: true
    },
    ownerName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: false,
      unique: false,
      validate: [validator.isEmail, "Please enter a valid email"]
    },
     gullakPoints: {
      type: Number,
      default: 0
    },
    hasPlacedFirstOrder: {
      type: Boolean,
      default: false
    },
     gullakUsed: {
        type: Number,
        default: 0
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended","approved","rejected"],
      default: "active"
    },
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid mobile number']
    },
    referralCode: {
      type: String,
      default: null
    },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralCode: { type: String, unique: false, sparse: true }, // optional, so sparse index
    otp: {
      type: String
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN", "SUPERADMIN"],
      default: "USER"
    },
    shopTime: {
      openingTime: {
        type: String, // Example: "09:00 AM"
        required: false
      },
      closingTime: {
        type: String, // Example: "09:00 PM"
        required: false
      }
    },
    image: {
      type: String, // URL or file path
      default: null
    },
    ratings: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "UsersAuth" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        review: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    location: locationSchema
  },
  {
    timestamps: true
  }
);

// shopSchema.pre("save", async function (next) {
//   // Generate referral code if not present
//   if (!this.referralCode) {
//     this.referralCode = `REF-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
//   }

//   // Hash password if modified
//   if (this.isModified("password")) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }

//   next();
// });
shopSchema.pre("save", async function (next) {
  if (!this.referralCode) {
    this.referralCode = `SHOP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  // Generate a unique referral code
  next();
});


// Remove duplicate pre-save hook
shopSchema.pre("save", async function (next) {
  if (this.isModified("password")) {

    // Hash the password
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});
// Compare password method for login
shopSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
shopSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate Reset Password Token
shopSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes expiration
  return resetToken;
};

shopSchema.methods.generateVerificationCode = function () {
  const generateRandomFiveDigitNumber = () => {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return parseInt(firstDigit + remainingDigits);
  };

  const verificationCode = generateRandomFiveDigitNumber();
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiration

  return verificationCode;
};

module.exports = mongoose.model("UsersAuth", shopSchema);