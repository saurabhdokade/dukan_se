const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CustomerAuth",
        required: true,
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        },
    ],
    deliveryType: {
        type: String,
        enum: ["HOME_DELIVERY", "SELF_PICKUP"],
        required: true,
    },
    address: {
        type: String,
        required: function () {
            return this.deliveryType === "HOME_DELIVERY";
        },
    },
    totalAmount: { type: Number, required: true },
    platformFee: { type: Number, default: 3 },
    convenienceFee: { type: Number, default: 6 },
    deliveryFee: { type: Number, default: 0 },
    gullakDiscount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ["CARD", "PHONE_PAY", "GOOGLE_PAY"],
        required: true,
    },
    status: {
        type: String,
        enum: ["PENDING", "PAID", "ACCEPTED", "PROCESSING", "PACKED", "PLACED", "CANCELLED", "DELIVERED"],
        default: "PENDING",
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Success", "Failed"],
        default: "Pending"
    },
    deliveryStatus: {
        type: String,
        enum: ["PENDING", "PROCESSING", "DELIVERED"],
        default: "PENDING"
    },
    cancelReason: {
        type: String,
        enum: [
            // Customer reasons
            "I want to change the Product",
            "Not available on the delivery time",
            "Price High",
            "I ordered wrong Product",
            "Vehicle Mechanical Issue",
            "Not Feeling Well",
            "Emergency or Personal Reason",
            "Rescheduling After Sometime",
            "Other",
        ],
    },
    // ✅ Optional custom text if "Other" selected
    otherReason: {
        type: String,
        default: null,
    },
    gullakUsed: {
        type: Number,
        default: 0
    },

    // ✅ Timestamp of cancellation
    cancelDate: {
        type: Date,
        default: null,
    },
    otp: {
        type: String,
        default: null
    },
    isOtpVerified: {
        type: Boolean,
        default: false
    },
    pickedAt: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    orderNumber: {
        type: String,
        unique: true
    },
    acceptedAt: {
        type: Date,
        default: null,
    },
    razorpayPaymentLinkId: {
        type: String,  // Ensure the type matches the one sent by Razorpay
        required: false,
        unique: false,  // You can make this field unique to prevent duplicates
    },
    razorpayOrderId: {
        type: String,
        required: false,
    },
    razorpayPaymentId: {
        type: String,
        required: false,
    },
    razorpayLinkId: {
        type: String
    },
    razorpayLinkStatus: {
        type: String,
        enum: ["created", "paid", "expired", "cancelled", "upi_qr_generated"],
        default: "created"
    },

}, {
    timestamps: true,
});

module.exports = mongoose.model("Order", orderSchema);
