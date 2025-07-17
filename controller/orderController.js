const Razorpay = require("razorpay");
const Cart = require("../model/cartModel");
const Order = require("../model/orderModel");
const BankDetails = require("../model/bankDetailsModel");
const catchAsyncError = require("../middlewares/catchAsyncErrors");
const Product = require("../model/productModel");
const Shop = require("../model/userModel");
const Notification = require("../model/notificationModel");
const User = require("../model/customerModel");
const Referral = require("../model/referalModel");
const GullakHistory = require("../model/GullakHistoryModel");
const crypto = require("crypto");
// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || "rzp_live_D3D9CzhhPmwAZe",
  key_secret: process.env.RAZORPAY_SECRET || "gTPUidHTVpnljtGjLZHUcFV4"
});

function formatOrderNumber(n) {
  return `#ODN${String(n).padStart(7, "0")}`;
}

// exports.buyFromCartAndPaySeller = catchAsyncError(async (req, res) => {
//   const userId = req.customer.id;
//   const {
//     deliveryType,
//     paymentMethod,
//     useGullak,
//     gullakBalance = 0
//   } = req.body;

//   // ✅ Step 1: Get cart
//   const cart = await Cart.findOne({ userId }).populate("items.productId");
//   if (!cart || cart.items.length === 0) {
//     return res.status(400).json({ success: false, message: "Cart is empty" });
//   }

//   // ✅ Step 2: Prepare items and amounts
//   const items = cart.items.map(i => ({
//     productId: i.productId._id,
//     quantity: i.quantity,
//     price: i.price
//   }));

//   const itemTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
//   const convenienceFee = 0;
//   const platformFee = 0;
//   const deliveryFee = deliveryType === "HOME_DELIVERY" ? 0 : 0;
//   const gullakDiscount = useGullak ? Math.min(itemTotal * 0.0, gullakBalance) : 0;
//   const finalAmount = itemTotal + convenienceFee + platformFee + deliveryFee - gullakDiscount;

//   // ✅ Step 3: Get Seller
//   const sellerId = cart.items[0].productId.createdBy;
//   const sellerBank = await BankDetails.findOne({ userId: sellerId });

//   if (!sellerBank) {
//     return res.status(404).json({ success: false, message: "Seller bank account not found" });
//   }

//   // ✅ Step 4: Razorpay Payment Link
//   const callbackURL = `http://localhost:5000/api/v1/payment/verify`;
//   const link = await razorpay.paymentLink.create({
//     amount: Math.round(finalAmount * 100),
//     currency: "INR",
//     accept_partial: false,
//     description: `Order payment – ₹${finalAmount}`,
//     customer: {
//       name: req.customer.name,
//       email: req.customer.email,
//       contact: req.customer.phoneNumber
//     },
//     notify: { sms: true, email: true },
//     reminder_enable: true,
//     callback_url: callbackURL,
//     callback_method: "get"
//   });

//   // ✅ Step 5: Create Order
//   const totalOrders = await Order.countDocuments();
//   const orderNumber = formatOrderNumber(totalOrders + 1);

//   const order = await Order.create({
//     userId,
//     items,
//     deliveryType,
//     address: req.customer.location?.formattedAddress || "",
//     totalAmount: itemTotal,
//     convenienceFee,
//     platformFee,
//     deliveryFee,
//     gullakDiscount,
//     finalAmount,
//     paymentMethod,
//     status: "PENDING",
//     razorpayLinkId: link.id,
//     razorpayLinkStatus: "created",
//     sellerBankDetails: {
//       bankName: sellerBank.bankName,
//       accountHolderName: sellerBank.accountHolderName,
//       accountNumber: sellerBank.accountNumber,
//       ifsc: sellerBank.ifsc,
//       accountType: sellerBank.accountType
//     },
//     orderNumber
//   });

//   // ✅ Step 6: Clear Cart
//   cart.items = [];
//   cart.totalAmount = 0;
//   await cart.save();

//   // ✅ Step 7: Create Notifications
//   await Notification.create({
//     user: sellerId,
//     userType: "UsersAuth",
//     title: "New Order Received",
//     message: `You have received a new order (${orderNumber}) from a customer.`,
//     orderId: order._id,
//     type: "ORDER"
//   });

//   await Notification.create({
//     user: userId,
//     userType: "CustomerAuth",
//     title: "Order Placed",
//     message: `Your order (${orderNumber}) has been placed successfully.`,
//     orderId: order._id,
//     type: "ORDER"
//   });

//   // ✅ Step 8: Return response
//   res.status(200).json({
//     success: true,
//     message: "Payment link created successfully",
//     paymentLink: link.short_url,
//     razorpayLinkId: link.id,
//     orderId: order._id,
//     orderNumber,
//     sellerBank,
//     customerLocation: req.customer.location,
//     amountToPay: finalAmount
//   });
// });

// controllers/orderController.js
exports.buyFromCartAndPaySellertue = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;
  const { deliveryType, paymentMethod, useGullak, gullakBalance = 0 } = req.body;

  const cart = await Cart.findOne({ userId }).populate("items.productId");
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  const items = cart.items.map(i => ({
    productId: i.productId._id,
    quantity: i.quantity,
    price: i.price
  }));

  const itemTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const finalAmount = itemTotal;
  const sellerId = cart.items[0].productId.createdBy;

  const link = await razorpay.paymentLink.create({
    amount: Math.round(finalAmount * 100),
    currency: "INR",
    description: `Order payment – ₹${finalAmount}`,
    customer: {
      name: req.customer.name,
      email: req.customer.email,
      contact: req.customer.phoneNumber
    },
    notify: { sms: true, email: true },
    callback_url: `http://localhost:5000/api/v1/payment/verify`,
    callback_method: "get"
  });

  const totalOrders = await Order.countDocuments();
  const orderNumber = formatOrderNumber(totalOrders + 1);

  const order = await Order.create({
    userId,
    items,
    deliveryType,
    address: req.customer.location?.formattedAddress || "",
    totalAmount: itemTotal,
    finalAmount,
    paymentMethod,
    status: "PENDING",
    razorpayLinkId: link.id,
    razorpayLinkStatus: "created",
    orderNumber
  });

  // ✅ Clear cart
  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  // ✅ Reward referrer if this is first order
  const customer = await User.findById(userId);
  if (!customer.hasPlacedFirstOrder && customer.referredBy) {
    const referrer = await User.findById(customer.referredBy);
    if (referrer) {
      referrer.gullakPoints += 50;
      await referrer.save();
    }
    customer.hasPlacedFirstOrder = true;
    await customer.save();
  }

  res.status(200).json({
    success: true,
    message: "Payment link created successfully",
    paymentLink: link.short_url,
    razorpayLinkId: link.id,
    orderId: order._id,
    orderNumber,
    amountToPay: finalAmount
  });
});
exports.buyFromCartAndPaySellerold = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;
  const { deliveryType, paymentMethod, useGullak, gullakBalance = 0 } = req.body;

  const cart = await Cart.findOne({ userId }).populate("items.productId");
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  const items = cart.items.map(i => ({
    productId: i.productId._id,
    quantity: i.quantity,
    price: i.price
  }));

  const itemTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  // Fetch customer
  const customer = await User.findById(userId);

  let appliedGullak = 0;
  if (useGullak && customer.gullakPoints > 0) {
    appliedGullak = Math.min(customer.gullakPoints, itemTotal);
  }

  const finalAmount = itemTotal - appliedGullak;
  const sellerId = cart.items[0].productId.createdBy;

  const link = await razorpay.paymentLink.create({
    amount: Math.round(finalAmount * 100),
    currency: "INR",
    description: `Order payment – ₹${finalAmount}`,
    customer: {
      name: customer.name,
      email: customer.email,
      contact: customer.phoneNumber
    },
    notify: { sms: true, email: true },
    callback_url: `http://localhost:5000/api/v1/payment/verify`,
    callback_method: "get"
  });

  const totalOrders = await Order.countDocuments();
  const orderNumber = formatOrderNumber(totalOrders + 1);

  const order = await Order.create({
    userId,
    items,
    deliveryType,
    address: customer.location?.formattedAddress || "",
    totalAmount: itemTotal,
    finalAmount,
    gullakUsed: appliedGullak,
    paymentMethod,
    status: "PENDING",
    razorpayLinkId: link.id,
    razorpayLinkStatus: "created",
    orderNumber
  });

  // ✅ Clear cart
  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  // ✅ Deduct Gullak Points
  if (appliedGullak > 0) {
    customer.gullakPoints -= appliedGullak;
  }

  // ✅ Reward referrer if this is first order
  if (!customer.hasPlacedFirstOrder && customer.referredBy) {
    const referrer = await User.findById(customer.referredBy);
    if (referrer) {
      referrer.gullakPoints += 50;
      await referrer.save();
    }
    customer.hasPlacedFirstOrder = true;
  }

  await customer.save();

  res.status(200).json({
    success: true,
    message: "Payment link created successfully",
    paymentLink: link.short_url,
    razorpayLinkId: link.id,
    orderId: order._id,
    orderNumber,
    amountToPay: finalAmount,
    gullakApplied: appliedGullak
  });
});

// exports.buyFromCartAndPaySeller = catchAsyncError(async (req, res) => {
//   const userId = req.customer.id;
//   const { deliveryType, paymentMethod, useGullak = false } = req.body;

//   // ✅ Step 1: Get cart
//   const cart = await Cart.findOne({ userId }).populate("items.productId");
//   if (!cart || cart.items.length === 0) {
//     return res.status(400).json({ success: false, message: "Cart is empty" });
//   }

//   // ✅ Step 2: Prepare items and totals
//   const items = cart.items.map(i => ({
//     productId: i.productId._id,
//     quantity: i.quantity,
//     price: i.price
//   }));

//   const itemTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
//   const convenienceFee = 0;
//   const platformFee = 0;
//   const deliveryFee = deliveryType === "HOME_DELIVERY" ? 0 : 0;

//   const customer = await User.findById(userId);

//   // ✅ Step 3: Apply Gullak
//   let appliedGullak = 0;
//   if (useGullak && customer.gullakPoints > 0) {
//     appliedGullak = Math.min(customer.gullakPoints, itemTotal);
//   }

//   const gullakDiscount = appliedGullak;
//   const finalAmount = itemTotal + convenienceFee + platformFee + deliveryFee - gullakDiscount;

//   // ✅ Step 4: Get Seller
//   const sellerId = cart.items[0].productId.createdBy;
//   const sellerBank = await BankDetails.findOne({ userId: sellerId });
//   if (!sellerBank) {
//     return res.status(404).json({ success: false, message: "Seller bank account not found" });
//   }

//   // ✅ Step 5: Razorpay Payment Link
//   const link = await razorpay.paymentLink.create({
//     amount: Math.round(finalAmount * 100),
//     currency: "INR",
//     description: `Order payment – ₹${finalAmount}`,
//     customer: {
//       name: customer.name,
//       email: customer.email,
//       contact: customer.phoneNumber
//     },
//     notify: { sms: true, email: true },
//     callback_url: `http://localhost:5000/api/v1/payment/verify`,
//     callback_method: "get"
//   });

//   // ✅ Step 6: Create Order
//   const totalOrders = await Order.countDocuments();
//   const orderNumber = `ORD-${String(totalOrders + 1).padStart(6, '0')}`;

//   const order = await Order.create({
//     userId,
//     items,
//     deliveryType,
//     address: customer.location?.formattedAddress || "",
//     totalAmount: itemTotal,
//     convenienceFee,
//     platformFee,
//     deliveryFee,
//     gullakDiscount,
//     finalAmount,
//     paymentMethod,
//     status: "PENDING",
//     razorpayLinkId: link.id,
//     razorpayLinkStatus: "created",
//     sellerBankDetails: {
//       bankName: sellerBank.bankName,
//       accountHolderName: sellerBank.accountHolderName,
//       accountNumber: sellerBank.accountNumber,
//       ifsc: sellerBank.ifsc,
//       accountType: sellerBank.accountType
//     },
//     orderNumber
//   });

//   // ✅ Step 7: Clear Cart
//   cart.items = [];
//   cart.totalAmount = 0;
//   await cart.save();

//   // ✅ Step 8: Deduct Gullak Points if used
//   if (appliedGullak > 0) {
//     customer.gullakPoints -= appliedGullak;
//     await GullakHistory.create({
//       userId: customer._id,
//       type: "REDEEMED",
//       coins: appliedGullak,
//       description: `You redeemed ₹${appliedGullak} gullak coins for your order`,
//       validTill: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
//     });

//     await Notification.create({
//       user: customer._id,
//       userType: "CustomerAuth",
//       title: "Gullak Coins Redeemed",
//       message: `₹${appliedGullak} gullak coins redeemed on order ${orderNumber}`,
//       orderId: order._id,
//       type: "GULLAK"
//     });
//   }

//   // ✅ Step 9: Reward Referrer if first order
//   if (!customer.hasPlacedFirstOrder && customer.referredBy) {
//     const referrer = await User.findById(customer.referredBy);
//     if (referrer) {
//       referrer.gullakPoints += 50;
//       await referrer.save();

//       await GullakHistory.create({
//         userId: referrer._id,
//         type: "EARNED",
//         coins: 50,
//         description: "You got ₹50 worth gullak coins for referring a friend",
//         validTill: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
//       });

//       await Notification.create({
//         user: referrer._id,
//         userType: "CustomerAuth",
//         title: "Referral Bonus Earned",
//         message: `You earned ₹50 gullak coins for referring a friend who placed their first order.`,
//         type: "GULLAK"
//       });
//     }

//     customer.hasPlacedFirstOrder = true;
//   }

//   // ✅ Save customer updates
//   await customer.save();

//   // ✅ Step 10: Order Notifications
//   await Notification.create({
//     user: sellerId,
//     userType: "UsersAuth",
//     title: "New Order Received",
//     message: `You have received a new order (${orderNumber}) from a customer.`,
//     orderId: order._id,
//     type: "ORDER"
//   });

//   await Notification.create({
//     user: userId,
//     userType: "CustomerAuth",
//     title: "Order Placed",
//     message: `Your order (${orderNumber}) has been placed successfully.`,
//     orderId: order._id,
//     type: "ORDER"
//   });

//   // ✅ Step 11: Response
//   res.status(200).json({
//     success: true,
//     message: "Payment link created successfully",
//     paymentLink: link.short_url,
//     razorpayLinkId: link.id,
//     orderId: order._id,
//     orderNumber,
//     sellerBank,
//     customerLocation: customer.location,
//     amountToPay: finalAmount,
//     gullakApplied: appliedGullak
//   });
// });

exports.buyFromCartAndPaySeller = catchAsyncError(async (req, res) => {
  try {
    const userId = req.customer.id;
    const { deliveryType, paymentMethod, useGullak = false, selectedAddress } = req.body;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const items = cart.items.map(i => ({
      productId: i.productId._id,
      quantity: i.quantity,
      price: i.price
    }));

    const itemTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
    const convenienceFee = 0;
    const platformFee = 0;
    const deliveryFee = deliveryType === "HOME_DELIVERY" ? 0 : 0;

    const customer = await User.findById(userId);

    let appliedGullak = 0;
    if (useGullak && customer.gullakPoints > 0) {
      appliedGullak = Math.min(customer.gullakPoints, itemTotal);
    }

    const gullakDiscount = appliedGullak;
    const finalAmount = itemTotal + convenienceFee + platformFee + deliveryFee - gullakDiscount;

    const sellerId = cart.items[0].productId.createdBy;
    const sellerBank = await BankDetails.findOne({ userId: sellerId });
    if (!sellerBank) {
      return res.status(404).json({ success: false, message: "Seller bank account not found" });
    }

    const finalAddress = selectedAddress || customer.location?.formattedAddress || "";
    if (!finalAddress) {
      return res.status(400).json({ success: false, message: "Delivery address not provided" });
    }

    const link = await razorpay.paymentLink.create({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      description: `Order payment – ₹${finalAmount}`,
      customer: {
        name: customer.name,
        email: customer.email,
        contact: customer.phoneNumber
      },
      notify: { sms: true, email: true },
      callback_url: `http://localhost:5000/api/v1/payment/verify`,
      callback_method: "get"
    });

    const totalOrders = await Order.countDocuments();
    const orderNumber = `ORD-${String(totalOrders + 1).padStart(6, '0')}`;

    const order = await Order.create({
      userId,
      items,
      deliveryType,
      address: finalAddress,
      totalAmount: itemTotal,
      convenienceFee,
      platformFee,
      deliveryFee,
      gullakDiscount,
      finalAmount,
      paymentMethod,
      status: "PENDING",
      paymentStatus: "Pending",
      razorpayLinkId: link.id,
      razorpayLinkStatus: "created",
      sellerBankDetails: {
        bankName: sellerBank.bankName,
        accountHolderName: sellerBank.accountHolderName,
        accountNumber: sellerBank.accountNumber,
        ifsc: sellerBank.ifsc,
        accountType: sellerBank.accountType
      },
      orderNumber
    });

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    if (appliedGullak > 0) {
      customer.gullakPoints -= appliedGullak;
      await GullakHistory.create({
        userId: customer._id,
        type: "REDEEMED",
        coins: appliedGullak,
        description: `You redeemed ₹${appliedGullak} gullak coins for your order`,
        validTill: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      });

      await Notification.create({
        user: customer._id,
        userType: "CustomerAuth",
        title: "Gullak Coins Redeemed",
        message: `₹${appliedGullak} gullak coins redeemed on order ${orderNumber}`,
        orderId: order._id,
        type: "GULLAK"
      });
    }

    if (!customer.hasPlacedFirstOrder && customer.referredBy) {
      const referrer = await User.findById(customer.referredBy);
      if (referrer) {
        referrer.gullakPoints += 50;
        await referrer.save();

        await GullakHistory.create({
          userId: referrer._id,
          type: "EARNED",
          coins: 50,
          description: "You got ₹50 worth gullak coins for referring a friend",
          validTill: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        });

        await Notification.create({
          user: referrer._id,
          userType: "CustomerAuth",
          title: "Referral Bonus Earned",
          message: `You earned ₹50 gullak coins for referring a friend who placed their first order.`,
          type: "GULLAK"
        });
      }

      customer.hasPlacedFirstOrder = true;
    }

    await customer.save();

    await Notification.create({
      user: sellerId,
      userType: "UsersAuth",
      title: "New Order Received",
      message: `You have received a new order (${orderNumber}) from a customer.`,
      orderId: order._id,
      type: "ORDER"
    });

    await Notification.create({
      user: userId,
      userType: "CustomerAuth",
      title: "Order Placed",
      message: `Your order (${orderNumber}) has been placed successfully.`,
      orderId: order._id,
      type: "ORDER"
    });

    res.status(200).json({
      success: true,
      message: "Payment link created successfully",
      paymentLink: link.short_url,
      razorpayLinkId: link.id,
      orderId: order._id,
      orderNumber,
      sellerBank,
      customerLocation: customer.location,
      addressUsed: finalAddress,
      amountToPay: finalAmount,
      gullakApplied: appliedGullak
    });
  } catch (error) {
    console.log("Error in buyFromCartAndPaySeller:", error);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
});


exports.verifyOnlinePayment = async (req, res) => {
  try {
    const {
      razorpay_payment_link_id,
      razorpay_payment_id,
      razorpay_payment_link_status
    } = req.query;

    const order = await Order.findOne({ razorpayLinkId: razorpay_payment_link_id });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (razorpay_payment_link_status === "paid") {
      order.paymentStatus = "Success";
      order.status = "PAID";
      order.deliveryStatus = "PROCESSING";
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpayLinkStatus = "paid";
      order.cashReceived = false;
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Payment verified and order marked as paid",
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentId: razorpay_payment_id
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: "Payment not completed yet"
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during payment verification"
    });
  }
};


exports.getReferralInfok = catchAsyncError(async (req, res) => {
  const customerId = req.customer.id;

  const customer = await User.findById(customerId).populate("referredBy", "name referralCode");

  const referrals = await User.find({ referredBy: customerId });

  res.status(200).json({
    success: true,
    referralCode: customer.referralCode,
    gullakPoints: customer.gullakPoints,
    referredBy: customer.referredBy ? {
      name: customer.referredBy.name,
      referralCode: customer.referredBy.referralCode
    } : null,
    myReferrals: referrals.map(r => ({
      name: r.name,
      phoneNumber: r.phoneNumber,
      date: r.createdAt
    }))
  });
});

exports.getReferralInfo = async (req, res) => {
  try {
    const customerId = req.customer.id;

    const customer = await User.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const earnedHistory = [];

    // Check if the user placed first order
    if (customer.hasPlacedFirstOrder) {
      // Let's say they earn 10 coins for 1st order, display 3 entries
      for (let i = 0; i < 3; i++) {
        earnedHistory.push({
          message: "Congratulations! You got 10 coins on your 1st order",
          coins: 10,
          validTill: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year validity
          earnedAt: customer.createdAt
        });
      }
    }

    return res.status(200).json({
      success: true,
      gullakPoints: customer.gullakPoints,
      earned: earnedHistory
    });

  } catch (error) {
    console.error("Gullak Earned API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

// ✅ Get all referrals by the current logged-in user
exports.getMyReferrals = async (req, res) => {
  try {
    const userId = req.customer.id;

    const referrals = await Referral.find({ referredBy: userId })
      .populate("referredUser", "name phoneNumber email") // only essential fields
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: referrals.length,
      referrals
    });

  } catch (error) {
    console.error("Referral Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching referrals"
    });
  }
};

exports.getRedeemedGullakHistory = async (req, res) => {
  try {
    const userId = req.customer.id;

    const redeemedOrders = await Order.find({
      userId,
      gullakUsed: { $gt: 0 }
    }).sort({ createdAt: -1 });

    const history = redeemedOrders.map(order => {
      let mode = order.deliveryType === "HOME_DELIVERY" ? "in delivery mode" : "in pickup mode";

      return {
        coins: order.gullakUsed,
        message: `${order.gullakUsed} coins Redeemed for your 1st order ${mode}`,
        redeemedAt: order.createdAt
      };
    });

    res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error("Error fetching redeemed gullak history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch redeemed gullak history"
    });
  }
};


exports.getEarnedGullakCoins = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;

  const earned = await GullakHistory.find({ userId, type: "EARNED" }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    gullakPoints: earned.reduce((sum, entry) => sum + entry.coins, 0),
    earned
  });
});

exports.getRedeemedGullakCoins = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;

  const redeemed = await GullakHistory.find({ userId, type: "REDEEMED" }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    totalRedeemed: redeemed.reduce((sum, entry) => sum + entry.coins, 0),
    redeemed
  });
});


//get gullk dashboard

exports.getGullakDashboard = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;
  const customer = await User.findById(userId);

  if (!customer) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const availableCoins = customer.gullakPoints || 0;
  const totalMeterSlots = 10;
  const coinsPerSlot = 10;
  const filledSlots = Math.floor(availableCoins / coinsPerSlot);
  const gullakMeter = [];

  for (let i = 0; i < totalMeterSlots; i++) {
    if (i < filledSlots) {
      gullakMeter.push("FILLED");
    } else {
      gullakMeter.push("EMPTY");
    }
  }

  const referralCode = customer.referralCode || "N/A";
  const rewardAmountPerReferral = 50;

  res.status(200).json({
    success: true,
    availableCoins,
    gullakMeter,
    referralCode,
    rewardAmountPerReferral,
    shareMessage: `Get ₹${rewardAmountPerReferral} worth Gullak coins when your friend makes their 1st order!`,
    shareCode: referralCode
  });
});

// controller/referralController.js
// exports.shareReferralCode = async (req, res) => {
//   try {
//     console.log("REQ.CUSTOMER: ", req.customer); // 🔍 DEBUG LOG

//     const userId = req.customer?._id;

//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const user = await User.findById(userId);

//     console.log("USER FROM DB:", user); // 🔍 DEBUG LOG

//     if (!user || !user.referralCode) {
//       return res.status(404).json({ success: false, message: "Referral code not found" });
//     }

//     const referralLink = `http://localhost:5000/api/v1/customer/signup?ref=${user.referralCode}`;

//     return res.status(200).json({
//       success: true,
//       referralCode: user.referralCode,
//       referralLink,
//       message: "Referral link generated successfully"
//     });
//   } catch (error) {
//     console.error("Share Referral Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while generating referral link"
//     });
//   }
// };

exports.shareReferralCode = async (req, res) => {
  try {
    const userId = req.customer?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let user = await User.findById(userId).select("+referralCode");

    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // If referralCode is missing, update it WITHOUT affecting password
    if (!user.referralCode) {
      const referralCode = `REF-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      await User.findByIdAndUpdate(userId, { referralCode }, { new: true });
      user = await User.findById(userId); // re-fetch to return updated value
    }

    const referralLink = `http://localhost:5000/api/v1/customer/signup?ref=${user.referralCode}`;

    return res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      referralLink,
      message: "Referral link generated successfully"
    });

  } catch (error) {
    console.error("Share Referral Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while generating referral link"
    });
  }
};




exports.getSellerNotifications = async (req, res) => {
  try {
    const sellerId = req.user?.id; // ensure seller auth middleware sets `req.seller`

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Seller not authenticated."
      });
    }

    const notifications = await Notification.find({
      user: sellerId,
      userType: "UsersAuth"
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Error getting seller notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};


exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.customer.id;
    const { orderId } = req.params;
    const { cancelReason, otherReason } = req.body;

    // Validate cancelReason
    if (!cancelReason) {
      return res.status(400).json({ success: false, message: "Cancel reason is required" });
    }

    const order = await Order.findById(orderId).populate("items.productId");

    if (!order || order.userId.toString() !== userId) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Order already cancelled" });
    }

    if (order.status === "DELIVERED") {
      return res.status(400).json({ success: false, message: "Delivered order cannot be cancelled" });
    }

    // Optional: Cancel Razorpay Payment Link if exists
    if (order.razorpayLinkId) {
      try {
        await razorpay.paymentLink.cancel(order.razorpayLinkId);
        order.razorpayLinkStatus = "cancelled";
      } catch (err) {
        console.error("Failed to cancel Razorpay Link:", err.message);
      }
    }

    // Update order status
    order.status = "CANCELLED";
    order.cancelReason = cancelReason;
    order.otherReason = cancelReason === "Other" ? otherReason : null;
    order.cancelDate = new Date();

    await order.save();

    const sellerId = order.items[0]?.productId?.createdBy;

    // ✅ Create Notification for Customer
    await Notification.create({
      user: userId, // ✅ correct field
      userType: "CustomerAuth",
      title: "Order Cancelled",
      message: `Your order (${order.orderNumber}) has been cancelled.`,
      orderId: order._id,
      type: "CANCEL"
    });

    // ✅ Create Notification for Seller
    if (sellerId) {
      await Notification.create({
        user: sellerId, // ✅ correct field
        userType: "UsersAuth",
        title: "Order Cancelled by Customer",
        message: `An order (${order.orderNumber}) was cancelled by the customer.`,
        orderId: order._id,
        type: "CANCEL"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        orderId: order._id,
        status: order.status,
        cancelReason: order.cancelReason,
        otherReason: order.otherReason,
        cancelDate: order.cancelDate,
        razorpayLinkStatus: order.razorpayLinkStatus
      }
    });

  } catch (error) {
    console.error("Cancel order error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};









// get seller orders

// exports.verifyOnlinePayment = catchAsyncError(async (req, res) => {
//   try {
//     const { razorpay_payment_link_id, razorpay_payment_id, razorpay_signature } = req.query;

//     // 🔒 Step 1: Validate input
//     if (!razorpay_payment_link_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required Razorpay parameters",
//       });
//     }

//     // 🔍 Step 2: Find the order by payment link ID
//     const order = await Order.findOne({ razorpayLinkId: razorpay_payment_link_id });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found",
//       });
//     }

//     // 🔐 Step 3: Verify Razorpay Signature
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "gTPUidHTVpnljtGjLZHUcFV4")
//       .update(`${razorpay_payment_link_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Signature mismatch. Payment verification failed.",
//       });
//     }

//     // ✅ Step 4: Update order status
//     order.status = "PAID";
//     order.paymentStatus = "Success";
//     order.razorpayPaymentId = razorpay_payment_id;
//     order.razorpayLinkStatus = "paid";
//     order.deliveryStatus = "DELIVERED";
//     order.cashReceived = false;
//     await order.save();

//     // ✅ Step 5: Respond with success
//     return res.status(200).json({
//       success: true,
//       message: "Payment verified successfully",
//       data: {
//         orderId: order._id,
//         orderNumber: order.orderNumber,
//         paymentId: razorpay_payment_id,
//         yourEarning: `₹${(order.totalAmount * 0.10).toFixed(0)}`
//       }
//     });
//   } catch (error) {
//     console.error("Payment Verification Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error during payment verification",
//     });
//   }
// });


exports.getAllSellerOrderssunday = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Step 1: Find products created by this seller
    const sellerProducts = await Product.find({ createdBy: sellerId }).select("_id");

    const sellerProductIds = sellerProducts.map(p => p._id);

    if (sellerProductIds.length === 0) {
      return res.status(200).json({ success: true, message: "No orders found", orders: [] });
    }

    // Step 2: Find orders that include seller's products
    const orders = await Order.find({ "items.productId": { $in: sellerProductIds } })
      .populate("userId", "name email phoneNumber address") // Customer info
      .populate("items.productId", "productName productPhotoFront productPhotoBack price") // Product info
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(200).json({ success: true, message: "No orders found", orders: [] });
    }

    // Step 3: Filter each order’s items to only include this seller's products
    const filteredOrders = orders.map(order => {
      const sellerItems = order.items.filter(item =>
        sellerProductIds.some(id => id.toString() === item.productId._id.toString())
      );

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        razorpayLinkStatus: order.razorpayLinkStatus,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        deliveryType: order.deliveryType,
        deliveryAddress: order.address,
        createdAt: order.createdAt,
        customer: {
          orderDate: order.createdAt,
          name: order.userId?.name || null,
          email: order.userId?.email || null,
          phoneNumber: order.userId?.phoneNumber || null,
          address: order?.address || null,
          ordertype: order.deliveryType || null
        },
        payment: {
          razorpayLinkId: order.razorpayLinkId,
          method: order.paymentMethod,
          date: order.createdAt,
          status: order.razorpayLinkStatus,
          totalAmount: order.totalAmount,
          finalAmount: order.finalAmount
        },
        products: sellerItems.map(item => ({
          name: item.productId.productName,
          quantity: item.quantity,
          price: item.price,
          productPhotoFront: item.productId.productPhotoFront || "",
          productPhotoBack: item.productId.productPhotoBack || ""
        }))
      };
    });

    res.status(200).json({
      success: true,
      totalOrders: filteredOrders.length,
      orders: filteredOrders
    });

  } catch (error) {
    console.error("Seller orders error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.getAllSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Step 1: Get seller's products
    const sellerProducts = await Product.find({ createdBy: sellerId }).select("_id");
    const sellerProductIds = sellerProducts.map(p => p._id);

    if (sellerProductIds.length === 0) {
      return res.status(200).json({ success: true, message: "No orders found", orders: [] });
    }

    // Step 2: Find orders with seller's products + payment filters
    const orders = await Order.find({
      "items.productId": { $in: sellerProductIds },
      razorpayLinkStatus: "paid",            // 🟢 Only where Razorpay link is paid
      status: ["PAID"],                        // 🟢 Order is marked as PAID
      paymentStatus: "Success"               // 🟢 Payment succeeded
    })
      .populate("userId", "name email phoneNumber address")
      .populate("items.productId", "productName productPhotoFront productPhotoBack price")
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(200).json({ success: true, message: "No orders found", orders: [] });
    }

    // Step 3: Filter each order to keep only seller's products
    const filteredOrders = orders.map(order => {
      const sellerItems = order.items.filter(item =>
        sellerProductIds.some(id => id.toString() === item.productId._id.toString())
      );

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        razorpayLinkStatus: order.razorpayLinkStatus,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        deliveryType: order.deliveryType,
        deliveryAddress: order.address,
        createdAt: order.createdAt,
        customer: {
          orderDate: order.createdAt,
          name: order.userId?.name || null,
          email: order.userId?.email || null,
          phoneNumber: order.userId?.phoneNumber || null,
          address: order?.address || null,
          ordertype: order.deliveryType || null
        },
        payment: {
          razorpayLinkId: order.razorpayLinkId,
          method: order.paymentMethod,
          date: order.createdAt,
          status: order.razorpayLinkStatus,
          totalAmount: order.totalAmount,
          finalAmount: order.finalAmount
        },
        products: sellerItems.map(item => ({
          name: item.productId.productName,
          quantity: item.quantity,
          price: item.price,
          productPhotoFront: item.productId.productPhotoFront || "",
          productPhotoBack: item.productId.productPhotoBack || ""
        }))
      };
    });

    return res.status(200).json({
      success: true,
      totalOrders: filteredOrders.length,
      orders: filteredOrders
    });

  } catch (error) {
    console.error("Seller orders error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




// controllers/orderController.js

exports.acceptOrder = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("items.productId", "productName productPhotoFront productPhotoBack price createdBy")
      .populate("userId", "name email phoneNumber address");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Check if seller has products in this order
    const sellerItems = order.items.filter(item =>
      item.productId.createdBy.toString() === sellerId
    );

    if (sellerItems.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this order" });
    }

    if (order.status !== "PAID") {
      return res.status(400).json({ success: false, message: `Order already ${order.status}` });
    }

    // ✅ Update order status
    order.status = "ACCEPTED";
    order.acceptedAt = new Date();
    await order.save();
    const deliveredItems = sellerItems
      .map(item => `${item.productId.productName} (x${item.quantity})`)
      .join(", ");

    // ✅ Send notification to the customer
    await Notification.create({
      user: order.userId._id,
      userType: "CustomerAuth",
      title: "Order Accepted",
      message: `Your order #${deliveredItems} has been accepted by the seller.`,
      orderId: order._id,
      type: "ORDER"
    });

    // ✅ Prepare response
    const fullOrder = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      acceptedAt: order.acceptedAt,
      paymentMethod: order.paymentMethod,
      razorpayLinkStatus: order.razorpayLinkStatus,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      deliveryType: order.deliveryType,
      deliveryAddress: order.address,
      createdAt: order.createdAt,
      customer: {
        orderDate: order.createdAt,
        name: order.userId.name,
        email: order.userId.email,
        phoneNumber: order.userId.phoneNumber,
        address: order.userId.address,
        ordertype: order.deliveryType
      },
      payment: {
        razorpayLinkId: order.razorpayLinkId,
        method: order.paymentMethod,
        date: order.createdAt,
        status: order.razorpayLinkStatus,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount
      },
      products: sellerItems.map(item => ({
        name: item.productId.productName,
        quantity: item.quantity,
        price: item.price,
        productPhotoFront: item.productId.productPhotoFront || "",
        productPhotoBack: item.productId.productPhotoBack || ""
      }))
    };

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      order: fullOrder
    });

  } catch (error) {
    console.error("Accept order error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all notifications for logged-in user
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.customer.id;        // From auth middleware
    // const userType = req.user.role === "CUSTOMER" ? "CustomerAuth" : "UsersAuth";

    const notifications = await Notification.find({
      user: userId,
      //   userType: userType
    }).sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
};


// controllers/orderController.js

// exports.markOrderPacked = async (req, res) => {
//   try {
//     const sellerId = req.user.id;
//     const { orderId } = req.params;

//     const order = await Order.findById(orderId).populate("items.productId");

//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     // Check if this seller has products in the order
//     const hasSellerProduct = order.items.some(item => {
//       return item.productId.createdBy.toString() === sellerId;
//     });

//     if (!hasSellerProduct) {
//       return res.status(403).json({ success: false, message: "Unauthorized access to this order" });
//     }

//     if (order.status !== "ACCEPTED") {
//       return res.status(400).json({
//         success: false,
//         message: `Only accepted orders can be marked as packed. Current status: ${order.status}`
//       });
//     }

//     order.status = "PACKED"; // Or use "PROCESSING" if preferred
//     order.packedAt = new Date();
//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: "Order marked as packed",
//       status: order.status,
//       packedAt: order.packedAt,
//       orderId: order._id,
//     });

//   } catch (error) {
//     console.error("Mark as packed error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// controllers/orderController.js
const sendOtpToPhone = async (phone, otp) => {
  console.log(`Simulated SMS to ${phone}: Your delivery OTP is ${otp}`);
  // ⬆️ Replace with real SMS logic if needed
};

exports.markOrderPacked = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("items.productId")
      .populate("userId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Ensure seller owns at least one product in this order
    const sellerItems = order.items.filter(item => {
      return item.productId.createdBy.toString() === sellerId;
    });

    if (sellerItems.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this order" });
    }

    if (order.status !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: `Only accepted orders can be marked as packed. Current status: ${order.status}`
      });
    }

    // Generate OTP & expiry
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Update order
    order.status = "PACKED";
    order.packedAt = new Date();
    order.otp = generatedOtp;
    order.otpExpiresAt = otpExpiresAt;
    await order.save();

    // Send OTP to customer (SMS, if needed)
    await sendOtpToPhone(order.userId.phoneNumber, generatedOtp);

    // Create notification message
    const packedProducts = sellerItems
      .map(item => `${item.productId.productName} (x${item.quantity})`)
      .join(", ");

    await Notification.create({
      user: order.userId._id,
      userType: "CustomerAuth",
      title: "Order Packed",
      message: `Your order is getting packed: ${packedProducts}. OTP: ${generatedOtp}`,
      type: "ORDER",
      orderId: order._id
    });

    // Format response like getAllSellerOrders
    const orderResponse = {
      otp: generatedOtp,
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      razorpayLinkStatus: order.razorpayLinkStatus,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      deliveryType: order.deliveryType,
      deliveryAddress: order.address,
      createdAt: order.createdAt,
      packedAt: order.packedAt,
      otpExpiresAt: order.otpExpiresAt,
      customer: {
        orderDate: order.createdAt,
        name: order.userId.name,
        email: order.userId.email,
        phoneNumber: order.userId.phoneNumber,
        address: order.userId.address,
        ordertype: order.deliveryType
      },
      payment: {
        razorpayLinkId: order.razorpayLinkId,
        method: order.paymentMethod,
        date: order.createdAt,
        status: order.razorpayLinkStatus,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount
      },
      products: sellerItems.map(item => ({
        name: item.productId.productName,
        quantity: item.quantity,
        price: item.price,
        productPhotoFront: item.productId.productPhotoFront || "",
        productPhotoBack: item.productId.productPhotoBack || ""
      }))
    };

    return res.status(200).json({
      success: true,
      message: "Order marked as packed. OTP sent to customer.",
      order: orderResponse
    });

  } catch (error) {
    console.error("Mark as packed error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.verifyOtpAndCompleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body;
    const sellerId = req.user.id;

    // Fetch order with customer and product info
    const order = await Order.findById(orderId)
      .populate("items.productId")
      .populate("userId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Check seller owns any product in the order
    const sellerItems = order.items.filter(item =>
      item.productId.createdBy.toString() === sellerId
    );

    if (sellerItems.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this order" });
    }

    // Validate order status
    if (order.status !== "PACKED") {
      return res.status(400).json({ success: false, message: "Order is not in PACKED status" });
    }

    // Validate OTP
    if (!order.otp || order.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > order.otpExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // Update order to DELIVERED
    order.status = "DELIVERED";
    order.deliveredAt = new Date();
    order.otp = null;
    order.otpExpiresAt = null;

    await order.save();

    // ✅ Create Notification for customer
    const deliveredItems = sellerItems
      .map(item => `${item.productId.productName} (x${item.quantity})`)
      .join(", ");

    await Notification.create({
      user: order.userId._id,
      userType: "CustomerAuth",
      title: "Order Delivered",
      message: `Your order has been delivered: ${deliveredItems}`,
      type: "ORDER",
      orderId: order._id
    });

    // Prepare full response
    const response = {
      orderId: order._id,
      otp: otp,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveredAt: order.deliveredAt,
      packedAt: order.packedAt,
      paymentMethod: order.paymentMethod,
      razorpayLinkStatus: order.razorpayLinkStatus,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      deliveryType: order.deliveryType,
      deliveryAddress: order.address,
      createdAt: order.createdAt,
      customer: {
        orderDate: order.createdAt,
        name: order.userId.name,
        email: order.userId.email,
        phoneNumber: order.userId.phoneNumber,
        address: order.userId.address,
        ordertype: order.deliveryType
      },
      payment: {
        razorpayLinkId: order.razorpayLinkId,
        method: order.paymentMethod,
        date: order.createdAt,
        status: order.razorpayLinkStatus,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount
      },
      products: sellerItems.map(item => ({
        name: item.productId.productName,
        quantity: item.quantity,
        price: item.price,
        productPhotoFront: item.productId.productPhotoFront || "",
        productPhotoBack: item.productId.productPhotoBack || ""
      }))
    };

    return res.status(200).json({
      success: true,
      message: "OTP verified. Order marked as DELIVERED.",
      order: response
    });

  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.cancelOrderBySeller = async (req, res) => {
  try {
    const sellerId = req.user.id; // from seller auth middleware
    const { orderId } = req.params;
    const { cancelReason, otherReason } = req.body;

    // Step 1: Find the order with customer and product info
    const order = await Order.findById(orderId)
      .populate("items.productId")
      .populate("userId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Step 2: Check if this order includes products created by the seller
    const sellerItems = order.items.filter(item =>
      item.productId.createdBy.toString() === sellerId
    );

    if (sellerItems.length === 0) {
      return res.status(403).json({ success: false, message: "You are not authorized to cancel this order" });
    }

    // Step 3: Prevent cancelling already delivered or cancelled orders
    if (["DELIVERED", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. Current status: ${order.status}`
      });
    }

    // Step 4: Cancel the order
    order.status = "CANCELLED";
    order.cancelReason = cancelReason;
    order.otherReason = cancelReason === "Other" ? otherReason : null;
    order.cancelDate = new Date();

    await order.save();

    // Step 5: Prepare detailed response
    const response = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      cancelReason: order.cancelReason,
      cancelDate: order.cancelDate,
      paymentMethod: order.paymentMethod,
      razorpayLinkStatus: order.razorpayLinkStatus,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      deliveryType: order.deliveryType,
      deliveryAddress: order.address,
      createdAt: order.createdAt,
      customer: {
        orderDate: order.createdAt,
        name: order.userId.name,
        email: order.userId.email,
        phoneNumber: order.userId.phoneNumber,
        address: order.userId.address,
        ordertype: order.deliveryType
      },
      payment: {
        razorpayLinkId: order.razorpayLinkId,
        method: order.paymentMethod,
        date: order.createdAt,
        status: order.razorpayLinkStatus,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount
      },
      products: sellerItems.map(item => ({
        name: item.productId.productName,
        quantity: item.quantity,
        price: item.price,
        productPhotoFront: item.productId.productPhotoFront || "",
        productPhotoBack: item.productId.productPhotoBack || ""
      }))
    };

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully by seller",
      order: response
    });

  } catch (error) {
    console.error("Seller cancel order error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


//get user orders

// Helper function to check if current time is within shop hours
const isShopOpen = (openingTime, closingTime) => {
  if (!openingTime || !closingTime) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [openHour, openMin, openMeridian] = openingTime.match(/(\d+):(\d+)\s*(AM|PM)/i).slice(1);
  const [closeHour, closeMin, closeMeridian] = closingTime.match(/(\d+):(\d+)\s*(AM|PM)/i).slice(1);

  const convertToMinutes = (h, m, meridian) => {
    let hour = parseInt(h);
    const min = parseInt(m);
    if (meridian.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (meridian.toUpperCase() === "AM" && hour === 12) hour = 0;
    return hour * 60 + min;
  };

  const openMinutes = convertToMinutes(openHour, openMin, openMeridian);
  const closeMinutes = convertToMinutes(closeHour, closeMin, closeMeridian);

  return currentTime >= openMinutes && currentTime <= closeMinutes;
};

exports.getMyOrdersWithShopDetails = catchAsyncError(async (req, res) => {
  const userId = req.customer.id;

  // 1. Get orders for user
  const orders = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "items.productId",
      select: "productName createdBy productPhotoFront productPhotoBack"
    });

  if (!orders.length) {
    return res.status(404).json({
      success: false,
      message: "No orders found for this user."
    });
  }

  // 2. Extract shop IDs from order items
  const shopIds = new Set();
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.productId && item.productId.createdBy) {
        shopIds.add(item.productId.createdBy.toString());
      }
    });
  });

  // 3. Fetch shop details
  const shops = await Shop.find({ _id: { $in: Array.from(shopIds) } })
    .select("shopName averageRating image mobileNumber email location.image location.formattedAddress shopTime");

  const shopMap = {};
  shops.forEach(shop => {
    const { openingTime, closingTime } = shop.shopTime || {};
    const isOpen = isShopOpen(openingTime, closingTime);
    shopMap[shop._id] = {
      ...shop.toObject(),
      shopStatus: isOpen ? "OPEN" : "CLOSED"
    };
  });

  // 4. Construct response
  const response = orders.map(order => {
    const orderShops = {};
    order.items.forEach(item => {
      const shopId = item.productId.createdBy;
      if (shopId && shopMap[shopId]) {
        orderShops[shopId] = shopMap[shopId];
      }
    });

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderAmount: order.finalAmount,
      otp: order.otp,
      status: order.status,
      deliveryType: order.deliveryType,
      createdAt: order.createdAt,
      shops: Object.values(orderShops),
      products: order.items.map(item => ({
        name: item.productId?.productName,
        quantity: item.quantity,
        price: item.price,
        productPhotoFront: item.productId?.productPhotoFront || null,
        productPhotoBack: item.productId?.productPhotoBack || null
      }))
    };
  });

  res.status(200).json({
    success: true,
    message: "Orders with shop details fetched successfully",
    orders: response
  });
});

exports.getOrderDetails = catchAsyncError(async (req, res) => {
  const { orderId } = req.params; // ⬅️ Use `orderId` from URL param

  // 1. Find order by _id
  const order = await Order.findById(orderId)
    .populate({
      path: "items.productId",
      select: "productName productPhotoFront createdBy"
    });

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  // 2. Get shop info from first product (assuming same shop)
  const firstProduct = order.items[0]?.productId;
  const shopId = firstProduct?.createdBy;

  const shop = await Shop.findById(shopId).select(
    "shopName mobileNumber location.formattedAddress"
  );

  // 3. Format response
  const response = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    otp: order.otp,
    orderStatus: order.status,
    deliveryType: order.deliveryType,
    orderDate: order.createdAt,

    shopDetails: {
      storeName: shop?.shopName || "",
      mobileNumber: shop?.mobileNumber || "",
      address: shop?.location?.formattedAddress || ""
    },

    products: order.items.map(item => ({
      name: item.productId?.productName,
      quantity: item.quantity,
      price: item.price,
      productImage: item.productId?.productPhotoFront || ""
    })),

    paymentDetails: {
      transactionId: order.razorpayPaymentId || order.razorpayPaymentLinkId || "",
      paymentDate: order.createdAt,
      paymentGateway: order.razorpayLinkId || "",
      paymentMethod: order.paymentMethod,
      paymentStatus: order.razorpayLinkStatus,
      shoppingAmount: order.totalAmount,
      convenienceFee: order.convenienceFee,
      platformFee: order.platformFee,
      gullakCoin: order.gullakDiscount,
      paidAmount: order.finalAmount
    }
  };

  return res.status(200).json({
    success: true,
    message: "Order details fetched successfully",
    order: response
  });
});