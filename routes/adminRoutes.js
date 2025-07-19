// routes/adminRoutes.js
const express = require("express");
const multer = require("../utils/multer");
const router = express.Router();
const {
    registerAdmin,
    loginAdmin,
    getAdminProfile,
    createOffer,
    getCustomerReferralDashboard,
    updateProduct,
    getAllCustomers,
    updateAdminProfile,
    getAllCustomerOrders,
    getCustomerDetails,createProduct,
    getAllShops,
    getOrderDetails,
    updateCustomerProfile,
    getShopDetails,
    updateShopProfile,
    updatePrivacy,
    updateOffer,
    getAllPayments,
    getAllProducts,
    getSellerReferralDashboard,
    updateShopStatus,
    registerNewShop,
    getPaymentDetails,
    getReferralDashboard,
    getProductDetails,
    getAllOrders,
    createTerms,
    getCoinEconomicsBarChart,
    getTerms,
    getMostInactiveCustomers,
    getCoinEconomicsChart,
    getPrivacy,
    createPrivacy,
    sendNotification,
    getCoinBreakageDashboard,
    getLastSellers,
    updateTerms,
    getSupportMessagesByTicket,
    getAllHelpSupportTickets,
    getLastGullakManagement,
    getOffersForCustomer,
    getAllOffers,
    getAllNotifications,
    getMostActiveCustomers,
    getSalesSummary,
    getPackedAndDeliveredOrderCount,
    resolveTicket,
    getAllShopswithfilters,
    getLastOrders,
    getAdminDashboard,
    getLastCustomers,
    getReferralProgramState,
    getOfferDetails,
    getMostOrderedItems,
    getSellerCustomerCounts
} = require("../controller/adminController");
const { isAuthenticatedAdmin, isAuthenticatedCustomer } = require("../middlewares/auth"); // your auth middleware
const { addFAQ, getAllFaqs, getFaqById, updateFaqById } = require("../controller/faqController");
const uploadFields = multer.fields([
  { name: "front", maxCount: 1 },
  { name: "back", maxCount: 1 },
]);

router.post("/register", registerAdmin);
router.post("/admin/login", loginAdmin);
router.get("/admin/me", isAuthenticatedAdmin, getAdminProfile);
router.patch("/admin/update/profile",  isAuthenticatedAdmin, multer.single("userProfile"), updateAdminProfile);


//customer
router.get("/admin/customers", getAllCustomers);
router.get("/customer/orders/:id", getAllCustomerOrders);
router.get("/order/details/:orderId", isAuthenticatedAdmin, getOrderDetails);
router.get("/customer/details/:id", getCustomerDetails);
router.put("/customer/update/:id", isAuthenticatedAdmin, updateCustomerProfile);

//shops
router.get("/getall/shops", getAllShops);
router.get("/shop/details/:shopId", getShopDetails);
router.put("/shop/update/:id",updateShopProfile);
router.put("/shop/status/:shopId", updateShopStatus);
router.post("/new/shop", registerNewShop);

//product
router.get("/getall/products", getAllProducts);
router.get("/productdetails/:productId", getProductDetails);
router.put("/update/product/:id",uploadFields,updateProduct);
router.post("/create/product",isAuthenticatedAdmin,uploadFields,createProduct);

//orders
router.get("/getall/orders",getAllOrders)

//payments
router.get("/getall/payments",getAllPayments);
router.get("/payment/:orderId", getPaymentDetails);


//setting 
// Terms
router.post("/createTerms", createTerms);
router.get("/get/getTerms", getTerms);
router.put("/updateTerms", updateTerms);
 
// Privacy
router.post("/createPrivacy", createPrivacy);
router.get("/get/getPrivacy", getPrivacy);
router.put("/updatePrivacy", updatePrivacy);

//notification
router.get("/getall/notifications",isAuthenticatedAdmin, getAllNotifications);
router.post("/notifications/send", sendNotification);


//help and support 
router.get("/help-support/tickets", getAllHelpSupportTickets);
router.get("/help-support/messages/:ticketId", getSupportMessagesByTicket);
router.put("/resolve/:ticketId", isAuthenticatedAdmin, resolveTicket);


//faq
router.post("/add",  isAuthenticatedAdmin, addFAQ);
router.get("/faqs",  isAuthenticatedAdmin, getAllFaqs);
router.get("/faqs/:id", getFaqById);

// Update FAQ by ID
router.put("/faqs/:id", isAuthenticatedAdmin,updateFaqById);

//offer 

// routes/offerRoutes.js
router.post(
  "/create/offer",
  multer.single("bannerImage"), 
  createOffer
);
router.get("/getall/customer-offers", isAuthenticatedCustomer, getOffersForCustomer);
router.get("/getall/offers", getAllOffers);
router.get("/offer/:id", getOfferDetails);
router.put(
  "/offer/:id",
  multer.single("bannerImage"), // if you allow banner image update
  updateOffer
);
//referal
router.get("/get/referral-dashboard", isAuthenticatedAdmin, getReferralDashboard);
router.get("/get/seller-referral-dashboard", isAuthenticatedAdmin, getSellerReferralDashboard);

router.get("/get/customer-referral-dashboard", isAuthenticatedAdmin, getCustomerReferralDashboard);
router.get("/get/coin-economics-chart", isAuthenticatedAdmin, getCoinEconomicsChart);

//gullak
router.get("/get/coin-breakage-dashboard", isAuthenticatedAdmin, getCoinBreakageDashboard);
router.get("/get/coin-economics-bar", getCoinEconomicsBarChart);
router.get("/get/gullak-management/latest", getLastGullakManagement);


//dashboard admin
router.get("/dashboard/admin", getAdminDashboard);
router.get("/admin/sales-summary", getSalesSummary);
router.get("/admin/last-orders", getLastOrders);
router.get("/admin/last-sellers", getLastSellers);
router.get("/admin/last-customers", getLastCustomers);
router.get("/admin/most-active-customers", getMostActiveCustomers);
router.get("/admin/most-inactive-customers", getMostInactiveCustomers);
router.get("/admin/most-ordered-items", getMostOrderedItems);
router.get("/admin/order-status-count", getPackedAndDeliveredOrderCount);
router.get("/admin/referral-program-state", getReferralProgramState);
router.get("/admin/seller-customer-counts", getSellerCustomerCounts);


//getall shops for vendor shop with all filer
router.get("/getallshops/shops", isAuthenticatedCustomer, getAllShopswithfilters);


module.exports = router;
