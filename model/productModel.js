const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  productType: {
    type: String,
    required: true
  },
  brand: {
    type: String
  },
  shopId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "UsersAuth", // Assuming your shop model is named "UsersAuth"
  required: false
  },

  packOf: {
    type: Number,
    default: 1
  },
  netWeight: {
    type: String // e.g., "1 Kg"
  },
  shelfLife: {
    type: String // e.g., "90 Days"
  },
  nutrientContent: {
    type: String
  },
  productDescription: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unitsAvailable: {
    type: Number,
    default: 0
  },
  productPhotoFront: {
    type: String, // URL to S3 or local image
    default: null
  },
  productPhotoBack: {
    type: String, // URL to S3 or local image
    default: null
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UsersAuth", // or your User model name
    required: true
  },
  createdByadmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdminAuth", // or your User model name
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);
