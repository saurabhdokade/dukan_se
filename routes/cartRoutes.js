const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  removeFromCart,
  saveForLater,
  incrementQuantity,
  moveToCart,
  decrementQuantity,
  clearCart
} = require("../controller/cartController");
const { isAuthenticatedCustomer } = require("../middlewares/auth");

router.post("/cart/add/:productId", isAuthenticatedCustomer, addToCart);
router.get("/cart", isAuthenticatedCustomer, getCart);
router.put("/cart/increment/:productId", isAuthenticatedCustomer, incrementQuantity);
router.put("/cart/decrement/:productId", isAuthenticatedCustomer, decrementQuantity);

router.delete("/cart/remove/:productId", isAuthenticatedCustomer, removeFromCart);
router.post("/cart/save/:productId", isAuthenticatedCustomer, saveForLater);
router.post("/cart/move/:productId", isAuthenticatedCustomer, moveToCart);
router.delete("/cart/clear", isAuthenticatedCustomer, clearCart);

module.exports = router;
