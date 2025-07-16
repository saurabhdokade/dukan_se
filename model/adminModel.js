const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");




// Admin Schema
const adminSchema = new mongoose.Schema(
    {
        fullname: {
            type: String,
            required: false,
            trim: true
        },
        username: {
            type: String,
            required: false,
            trim: true
        },
        gender: {
            type: String,
            enum: ["MALE", "FEMALE", "OTHER"],
            default: "OTHER"
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            validate: [validator.isEmail, "Please enter a valid email address"],
            lowercase: true,
            index: true
        },
        phoneNumber: {
            type: String,
            required: false,
            unique: false,
            match: [
                /^\+?[1-9]\d{1,14}$/,
                "Please provide a valid phone number with a country code (e.g., +1234567890)"
            ],
            maxlength: [15, "Phone number cannot be longer than 15 characters"]
        },
        password: {
            type: String,
            required: false,
            minlength: [8, "Password should be at least 8 characters"],
            select: false
        },
        role: {
            type: String,
            enum: ["SUPER_ADMIN", "ADMIN"],
            default: "ADMIN"
        },
        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active"
        },
        registrationDate: {
            type: Date,
            default: Date.now
        },
        userProfile: {
            type: String,
            default: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
        },
        otp: { type: String },
        otpExpire: { type: Date },
        isVerified: { type: Boolean, default: false },
        resetPasswordToken: { type: String },
        resetPasswordExpire: { type: Date },
        verificationCode: { type: Number },
        verificationCodeExpire: { type: Date },
    },
    { timestamps: true }
);

// Pre-save Hook
adminSchema.pre("save", async function (next) {
  // Generate referral code if not present
  if (!this.referralCode) {
    this.referralCode = `REF-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  // Hash password if modified
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});


// Compare Password Method
adminSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
adminSchema.methods.getJWTToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Generate Reset Password Token
adminSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

    return resetToken;
};

// Generate OTP Verification Code
adminSchema.methods.generateVerificationCode = function () {
    const generateRandomFiveDigitNumber = () => {
        const firstDigit = Math.floor(Math.random() * 9) + 1;
        const remainingDigits = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        return parseInt(firstDigit + remainingDigits);
    };

    const verificationCode = generateRandomFiveDigitNumber();

    this.verificationCode = verificationCode;
    this.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return verificationCode;
};

module.exports = mongoose.model("AdminAuth", adminSchema);
