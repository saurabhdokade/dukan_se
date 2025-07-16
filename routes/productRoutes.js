const express = require("express");
const router = express.Router();
const productController = require("../controller/productController");
const { isAuthenticatedUser } = require("../middlewares/auth");
const multer = require("../utils/multer");

// Multer configuration for uploading front and back images
const uploadFields = multer.fields([
  { name: "front", maxCount: 1 },
  { name: "back", maxCount: 1 },
]);

// CREATE Product
router.post(
  "/create",
  isAuthenticatedUser,
  uploadFields,
  productController.createProduct
);

router.put('/product/:productId/update-stock', productController.updatePriceAndUnits);

// GET /api/v1/products/shop/:shopId
router.get('/products/shop/:userId', productController.getShopProducts);


// GET All Products
router.get("/all/products",  productController.getAllProducts);

// GET Product by ID
router.get("/products/:id", isAuthenticatedUser, productController.getProductById);

// UPDATE Product
router.put(
  "/:id",
  isAuthenticatedUser,
  uploadFields,
  productController.updateProduct
);

// DELETE Product
router.delete("/:id", isAuthenticatedUser, productController.deleteProduct);

module.exports = router;
