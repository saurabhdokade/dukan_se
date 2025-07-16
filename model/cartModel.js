const mongoose = require("mongoose");
 
const cartSchema = mongoose.Schema(
  {
    userId: {   // ✅ UserId Cart ke top-level pe hona chahiye
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAuth",
      required: true,  // ✅ UserId required hoga
      unique: true  // ✅ Har user ka ek hi cart hoga
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          default: 1
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    savedForLater: [ // Add this section
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          default: 1
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
  },
  { timestamps: true }
);
 
module.exports = mongoose.model("Cart", cartSchema);
 