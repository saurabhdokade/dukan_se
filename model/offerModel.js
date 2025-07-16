// models/Offer.js

const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
    userType: {
        type: String,
        enum: ["CustomerAuth", "UsersAuth"],
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "userType",
        required: true
    },
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        }
    ],
    discountRate: {
        type: Number,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    offerStartDate: {
        type: Date,
        required: true
    },
    offerExpireDate: {
        type: Date,
        required: true
    },
    offerText: [
        {
            type: String,
            trim: true
        }
    ],

    bannerImage: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Offer", offerSchema);
