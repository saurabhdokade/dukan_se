const express = require("express");
const router = express.Router();
const { isAuthenticatedCustomer,isAuthenticatedUser } = require("../middlewares/auth");
const { buyFromCartAndPaySeller,cancelOrder,getSellerCancelledOrdersList,getAcceptedOrdersList,getGullakDashboard,verifyOnlinePayment,getEarnedGullakCoins,getRedeemedGullakCoins,getRedeemedGullakHistory,getMyReferrals,shareReferralCode,getReferralInfo,getMyNotifications,getSellerNotifications,getOrderDetails,getAllSellerOrders,getMyOrdersWithShopDetails,acceptOrder,markOrderPacked,verifyOtpAndCompleteOrder,cancelOrderBySeller } = require("../controller/orderController");

router.post("/order/buy-now", isAuthenticatedCustomer, buyFromCartAndPaySeller);
router.get("/referral-info", isAuthenticatedCustomer, getReferralInfo);

router.put("/cancel/:orderId", isAuthenticatedCustomer, cancelOrder);

router.get("/payment/verify", verifyOnlinePayment);

//refer
router.get("/share", isAuthenticatedCustomer, shareReferralCode);

router.get("/my-referrals", isAuthenticatedCustomer, getMyReferrals);
router.get("/my-referrals-info", isAuthenticatedCustomer, getReferralInfo);
router.get("/gullak/redeemed", isAuthenticatedCustomer, getRedeemedGullakHistory);


//get gullak history
router.get("/gullak/earned", isAuthenticatedCustomer, getEarnedGullakCoins);
router.get("/gullak/redeemed", isAuthenticatedCustomer, getRedeemedGullakCoins);
router.get("/gullak/dashboard", isAuthenticatedCustomer, getGullakDashboard);


//seller order routes
router.get("/seller/orders", isAuthenticatedUser, getAllSellerOrders);

router.put("/seller/order/:orderId/accept", isAuthenticatedUser, acceptOrder);
router.get("/seller/orders/accepted", isAuthenticatedUser, getAcceptedOrdersList);

router.put("/seller/order/:orderId/mark-packed", isAuthenticatedUser, markOrderPacked);
router.post("/order/verify-otp/:orderId", isAuthenticatedUser, verifyOtpAndCompleteOrder);
router.put("/seller/orders/:orderId/cancel", isAuthenticatedUser, cancelOrderBySeller);
router.get("/seller/orders/cancelled", isAuthenticatedUser, getSellerCancelledOrdersList);

//get user orders

router.get("/my-orders", isAuthenticatedCustomer, getMyOrdersWithShopDetails);
router.get("/getorderdetails/:orderId",isAuthenticatedCustomer,getOrderDetails)

//notifications
router.get("/notifications", isAuthenticatedCustomer, getMyNotifications);
router.get("/seller/notifications", isAuthenticatedUser, getSellerNotifications);

module.exports = router;
