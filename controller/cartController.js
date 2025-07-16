const Cart = require("../model/cartModel");
const Product = require("../model/productModel");
const catchAsyncError = require("../middlewares/catchAsyncErrors");

// ✅ Add product to cart
exports.addToCart = catchAsyncError(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;
  const userId = req.customer.id;

  const parsedQuantity = Number(quantity);
  if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
    return res.status(400).json({ success: false, message: "Invalid quantity" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  let cart = await Cart.findOne({ userId });
  if (!cart) cart = new Cart({ userId, items: [], totalAmount: 0 });

  const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

  if (itemIndex !== -1) {
    cart.items[itemIndex].quantity += parsedQuantity;
  } else {
    cart.items.push({ productId, quantity: parsedQuantity, price: product.price });
  }

  cart.totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  await cart.save();

  return res.status(200).json({ success: true, message: "Item added to cart", cart });
});

// ✅ Get cart
exports.getCart = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;

  const cart = await Cart.findOne({ userId })
    .populate("items.productId", "productName price productPhotoFront")
    .populate("savedForLater.productId", "productName price productPhotoFront");

  if (!cart) {
    return res.status(404).json({ success: false, message: "Cart not found" });
  }

  res.status(200).json({ success: true, cart });
});

// ✅ Increment product quantity in cart
exports.incrementQuantity = catchAsyncError(async (req, res) => {
  const { productId } = req.params;
  const userId = req.customer.id;

  const cart = await Cart.findOne({ userId });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

  const item = cart.items.find(item => item.productId.toString() === productId);
  if (!item) return res.status(404).json({ success: false, message: "Product not found in cart" });

  item.quantity += 1;

  cart.totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  await cart.save();

  res.status(200).json({ success: true, message: "Quantity incremented", cart });
});

// ✅ Decrement product quantity in cart
exports.decrementQuantity = catchAsyncError(async (req, res) => {
  const { productId } = req.params;
  const userId = req.customer.id;

  const cart = await Cart.findOne({ userId });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

  const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
  if (itemIndex === -1) return res.status(404).json({ success: false, message: "Product not found in cart" });

  if (cart.items[itemIndex].quantity > 1) {
    cart.items[itemIndex].quantity -= 1;
  } else {
    cart.items.splice(itemIndex, 1); // Remove item if quantity becomes 0
  }

  cart.totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  await cart.save();

  res.status(200).json({ success: true, message: "Quantity decremented", cart });
});


// ✅ Remove item from cart
exports.removeFromCart = catchAsyncError(async (req, res) => {
  const { productId } = req.params;
  const userId = req.customer.id;

  const cart = await Cart.findOne({ userId });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

  cart.items = cart.items.filter(item => item.productId.toString() !== productId);

  cart.totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  await cart.save();

  res.status(200).json({ success: true, message: "Item removed", cart });
});

// ✅ Save item for later
exports.saveForLater = catchAsyncError(async (req, res) => {
  const { productId } = req.params;
  const userId = req.customer.id;

  const cart = await Cart.findOne({ userId });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

  const index = cart.items.findIndex(item => item.productId.toString() === productId);
  if (index === -1) return res.status(404).json({ success: false, message: "Item not in cart" });

  const item = cart.items[index];
  cart.items.splice(index, 1);
  cart.savedForLater.push(item);

  cart.totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  await cart.save();
  res.status(200).json({ success: true, message: "Item saved for later", cart });
});

// ✅ Move item from saved to cart
exports.moveToCart = catchAsyncError(async (req, res) => {
  const { productId } = req.params;
  const userId = req.customer.id;

  const cart = await Cart.findOne({ userId });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

  const index = cart.savedForLater.findIndex(item => item.productId.toString() === productId);
  if (index === -1) return res.status(404).json({ success: false, message: "Item not in saved" });

  const item = cart.savedForLater[index];
  cart.savedForLater.splice(index, 1);

  const existingIndex = cart.items.findIndex(item => item.productId.toString() === productId);
  if (existingIndex !== -1) {
    cart.items[existingIndex].quantity += item.quantity;
  } else {
    cart.items.push(item);
  }

  cart.totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  await cart.save();
  res.status(200).json({ success: true, message: "Moved to cart", cart });
});

// ✅ Clear cart
exports.clearCart = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;
  const cart = await Cart.findOne({ userId });

  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  res.status(200).json({ success: true, message: "Cart cleared", cart });
});
