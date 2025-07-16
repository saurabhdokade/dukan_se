const Product = require("../model/productModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");
const mongoose = require("mongoose");
// Create Product
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  const {
    productName,
    productType,
    brand,
    packOf,
    netWeight,
    shelfLife,
    nutrientContent,
    productDescription,
    price,
    unitsAvailable,
    barcode,
  } = req.body;

  const product = await Product.create({
    productName,
    productType,
    brand,
    packOf,
    netWeight,
    shelfLife,
    nutrientContent,
    productDescription,
    price,
    unitsAvailable,
    barcode,
    productPhotoFront: req.files?.front?.[0]?.path || null,
    productPhotoBack: req.files?.back?.[0]?.path || null,
    createdBy: req.user._id, // assuming auth middleware sets req.user
  });

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    product,
  });
});

// Update Price and Units
exports.updatePriceAndUnits = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { price, unitsAvailable } = req.body;

  if (!price || !unitsAvailable) {
    return next(new ErrorHander("Price and Units are required", 400));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHander("Product not found", 404));
  }

  product.price = price;
  product.unitsAvailable = unitsAvailable;

  await product.save();

  res.status(200).json({
    success: true,
    message: "Product price and units updated successfully",
    product
  });
});

// Get all products for a specific shop
// exports.getShopProducts = catchAsyncErrors(async (req, res, next) => {
//   const { shopId } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(shopId)) {
//     return res.status(400).json({ success: false, message: "Invalid shop ID" });
//   }

//   const products = await Product.find({ shopId });

//   if (!products || products.length === 0) {
//     return res.status(404).json({
//       success: false,
//       message: "No products found for this shop",
//     });
//   }

//   res.status(200).json({ success: true, products });
// });


exports.getShopProducts = catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  const products = await Product.find({ createdBy: userId });

  if (!products || products.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No products found for this user",
    });
  }

  res.status(200).json({
    success: true,
    products,
  });
});

// Get All Products
exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const products = await Product.find({ createdBy: req.user._id });
  res.status(200).json({ success: true, products });
});

// Get Product by ID
exports.getProductById = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  res.status(200).json({ success: true, product });
});

// Update Product
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const updates = req.body;
  if (req.files?.front?.[0]?.path) updates.productPhotoFront = req.files.front[0].path;
  if (req.files?.back?.[0]?.path) updates.productPhotoBack = req.files.back[0].path;

  Object.assign(product, updates);
  await product.save();

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    product,
  });
});

// Delete Product
exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  await product.deleteOne();
  res.status(200).json({ success: true, message: "Product deleted" });
});
