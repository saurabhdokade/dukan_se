const express = require("express");
const router = express.Router();
const {
  registerCustomer,
  loginUser,
  addCustomerAddress,
  updateUserProfile,
  removeAddress,
  getAllAddresses,
  verifyCustomerOtp,
  getCustomerProfile
} = require("../controller/customerController"); // adjust the path if needed

const { isAuthenticatedUser,isAuthenticatedCustomer } = require("../middlewares/auth"); // Middleware to protect routes
const upload = require("../utils/multer"); // Middleware for file upload, e.g., Multer with S3


router.post("/customer/signup", registerCustomer);
router.post("/verify-otp", verifyCustomerOtp);
router.post("/add-address", isAuthenticatedCustomer, addCustomerAddress);
router.delete("/remove-address/:addressId", isAuthenticatedCustomer,removeAddress);
router.get("/get-all-addresses", isAuthenticatedCustomer, getAllAddresses);

router.post("/login", loginUser); // Assuming user is authenticated

router.put("/update/:id", isAuthenticatedCustomer, upload.single("userProfile"), updateUserProfile);
router.get("/profile/:userId", isAuthenticatedCustomer,getCustomerProfile);

module.exports = router;
