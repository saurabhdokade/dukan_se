const express = require("express");
const router = express.Router();
const {
  registerCustomer,
  loginUser,
  updateUserProfile
} = require("../controller/customerController"); // adjust the path if needed

const { isAuthenticatedUser } = require("../middlewares/auth"); // Middleware to protect routes
const upload = require("../utils/multer"); // Middleware for file upload, e.g., Multer with S3


router.post("/customer/signup", registerCustomer);

router.post("/login", loginUser); // Assuming user is authenticated

router.put("/update/:id", isAuthenticatedUser, upload.single("userProfile"), updateUserProfile);

module.exports = router;
