const express = require("express");
const router = express.Router();
const {
  registerShop,
  sendOtpToMobile,
  verifyOtpAndLogin,
  updateShopProfile,
  uploadKYCImages,
  getKYCByUser,
  createOrUpdateBankDetails,
  getSellerCommissionHistory,
  getBankDetails,
  rateShop,
  getAllSellers,
  getSellerYearlyRevenue,
  getSellerDashboard,
  getSellerDailyOrderReport,
  getSellerMonthlyOrderReport,
  getSellerWalletSummary,
  getUpcomingPayouts,
  getLastTransaction,
  getReferralHistory,
  shareShopReferralCode
} = require("../controller/userController"); // adjust the path if needed

const { isAuthenticatedUser,isAuthenticatedCustomer } = require("../middlewares/auth"); // Middleware to protect routes
const upload = require("../utils/multer"); // Middleware for file upload, e.g., Multer with S3


// router.post("/signup", registerShop);

//refer
// 👉 Register new shop
router.post("/signup", registerShop);
// 👉 Share shop referal code (requires auth)
router.get("/share-referral", isAuthenticatedUser, shareShopReferralCode);
router.get(
  "/referral-history",
  isAuthenticatedUser, // your auth middleware
  getReferralHistory
);


router.get("/getallshop",getAllSellers)
router.post("/send-otp", sendOtpToMobile);
router.post("/verify-otp/seller", verifyOtpAndLogin);
router.put(
  "/kyc/upload",
  isAuthenticatedUser,
  upload.fields([
    { name: "panImage", maxCount: 1 },
    { name: "gstImage", maxCount: 1 }
  ]),
  uploadKYCImages
);

router.put(
  "/bank-details/update",
  isAuthenticatedUser,
  upload.single("passbookImage"),
  createOrUpdateBankDetails
);

router.get("/bank-details", isAuthenticatedUser, getBankDetails);
router.get("/:userId", isAuthenticatedUser, getKYCByUser);
router.put("/update/shopprofile/:id", upload.single("image"), updateShopProfile);


//rating
router.post("/shop/:shopId/rate", isAuthenticatedCustomer, rateShop);

//dashbpard
router.get('/seller/dashboard', isAuthenticatedUser, getSellerDashboard);
router.get("/seller/yearly-revenue", isAuthenticatedUser, getSellerYearlyRevenue);
router.get("/seller/daily-order-report", isAuthenticatedUser, getSellerDailyOrderReport);
router.get("/seller/monthly-order-report", isAuthenticatedUser, getSellerMonthlyOrderReport);


//wallet
router.get("/seller/wallet",isAuthenticatedUser, getSellerWalletSummary);
router.get("/seller/upcoming-payouts", isAuthenticatedUser, getUpcomingPayouts);
router.get("/seller/last-transaction", isAuthenticatedUser, getLastTransaction);
router.get("/seller/commission", isAuthenticatedUser, getSellerCommissionHistory);
module.exports = router;
