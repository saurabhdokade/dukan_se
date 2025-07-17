const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/userModel");
const sendToken = require("../utils/jwtToken");
const bcrypt = require("bcryptjs");
const {sendOTP} = require("../utils/twilio");
const KYC = require("../model/kycModel");
const BankDetails = require("../model/bankDetailsModel");
const Order = require("../model/orderModel")
const sendEmail = require("../utils/sendEmail");
const mongoose = require("mongoose");
// Register

// Create a new shop
// exports.registerShop = catchAsyncErrors(async (req, res, next) => {
//   const {
//     shopName,
//     gstinNumber,
//     ownerName,
//     mobileNumber,
//     password,
//     referralCode,
//     image,
//     shopTime,
//     location
//   } = req.body;

//   if (!mobileNumber || !password) {
//     return next(new ErrorHander("Mobile number and password are required", 400));
//   }

//   const existing = await User.findOne({ mobileNumber });
//   if (existing) {
//     return next(new ErrorHander("Shop with this mobile number already exists", 400));
//   }

//   const user = await User.create({
//     shopName,
//     gstinNumber,
//     ownerName,
//     mobileNumber,
//     referralCode,
//     shopTime,
//     image,
//     location,
//     isVerified: false,
//     role: "USER"
//   });

//   sendToken(user, 201, res); // auto-login after register
// });
exports.registerShopold = async (req, res, next) => {
  try {
    const {
      shopName,
      gstinNumber,
      ownerName,
      mobileNumber,
      password,
      referralCode, // optional
      image,
      shopTime,
      location
    } = req.body;

    if (!mobileNumber || !password) {
      return next(new ErrorHander("Mobile number and password are required", 400));
    }

    // Check if shop with same mobile exists
    const existingShop = await User.findOne({ mobileNumber });
    if (existingShop) {
      return next(new ErrorHander("Shop with this mobile number already exists", 400));
    }

    // If referralCode given, validate it
    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode });
      if (!referredByUser) {
        return next(new ErrorHander("Invalid referral code", 400));
      }
    }

    const newShop = await User.create({
      shopName,
      gstinNumber,
      ownerName,
      mobileNumber,
      password,
      referralCode, // store original code if you want
      referredBy: referredByUser ? referredByUser._id : null,
      shopTime,
      image,
      location,
      isVerified: false,
      role: "USER"
    });

    sendToken(newShop, 201, res); // auto-login after register
  } catch (error) {
    console.error("Shop Registration Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.registerShop = async (req, res, next) => {
  try {
    const {
      shopName, gstinNumber, ownerName, mobileNumber, password,
      referralCode, image, shopTime, location
    } = req.body;

    if (!mobileNumber || !password) {
      return next(new ErrorHander("Mobile number and password are required", 400));
    }

    const existingShop = await User.findOne({ mobileNumber });
    if (existingShop) {
      return next(new ErrorHander("Shop with this mobile number already exists", 400));
    }

    let referredByShop = null;
    if (referralCode) {
      referredByShop = await User.findOne({ referralCode });
      if (!referredByShop) {
        return next(new ErrorHander("Invalid referral code", 400));
      }
    }

    // ✅ SAFE: Generate unique referral code BEFORE create
    const uniqueReferralCode = await generateUniqueReferralCode("SHOP");

    const newShop = await User.create({
      shopName,
      gstinNumber,
      ownerName,
      mobileNumber,
      password,
      referralCode: uniqueReferralCode, // always unique
      referredBy: referredByShop ? referredByShop._id : null,
      shopTime,
      image,
      location,
      role: "USER",
      isVerified: false
    });

   if (referredByShop) {
  await User.findByIdAndUpdate(
    referredByShop._id,
    { $inc: { gullakPoints: 50 } }
  );

  // 🟢 Log the referral transaction
  await ReferralTransaction.create({
    referrer: referredByShop._id,
    referredUser: newShop._id,
    amount: 50,
    note: `Referral bonus for referring ${newShop.shopName}`
  });
}


    sendToken(newShop, 201, res);

  } catch (error) {
    console.error("Shop Registration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during shop registration"
    });
  }
};



async function generateUniqueReferralCode(prefix = "SHOP") {
  let code;
  let exists = true;

  while (exists) {
    code = `${prefix}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    exists = await User.findOne({ referralCode: code });
  }

  return code;
}
exports.shareShopReferralCode = async (req, res) => {
  try {
    const userId = req.user?._id; // from isAuthenticated middleware

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let user = await User.findById(userId).select("+referralCode");

    if (!user) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    if (!user.referralCode) {
      const newReferralCode = `SHOP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      await UsersAuth.findByIdAndUpdate(userId, { referralCode: newReferralCode }, { new: true });
      user = await UsersAuth.findById(userId); // refresh
    }

    const referralLink = `http://localhost:5000/api/v1/signup?ref=${user.referralCode}`;

    return res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      referralLink,
      message: "Shop referral link generated successfully"
    });

  } catch (error) {
    console.error("Share Shop Referral Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while generating shop referral link"
    });
  }
};

// controllers/referralController.js

const ReferralTransaction = require("../model/ReferralTransactionModel");

exports.getReferralHistory = async (req, res) => {
  try {
    const userId = req.user?._id; // assuming you attach the shop user

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const history = await ReferralTransaction.find({ referrer: userId })
      .populate("referredUser", "shopName ownerName") // get names
      .sort({ createdAt: -1 });

    const formatted = history.map(tx => ({
      date: tx.createdAt,
      referredName: tx.referredUser.shopName || tx.referredUser.ownerName,
      amount: tx.amount
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });

  } catch (error) {
    console.error("Referral History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching referral history"
    });
  }
};




//for superadmin changes password
// 📤 Send OTP to mobile number
exports.sendOtpToMobile = catchAsyncErrors(async (req, res, next) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    return next(new ErrorHandler("Mobile number is required", 400));
  }

  const user = await User.findOne({ mobileNumber });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const otp = Math.floor(100000 + Math.random() * 900000); // generate 6-digit OTP
  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  await sendOTP(mobileNumber, otp); // 🔥 send actual SMS

  res.status(200).json({
    success: true,
    message: `OTP sent successfully to +91${mobileNumber}, OTP: ${otp}` // 🔒
  });
});

// ✅ Verify OTP and login
exports.verifyOtpAndLogin = catchAsyncErrors(async (req, res, next) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    return next(new ErrorHander("Mobile number and OTP are required", 400));
  }

  const user = await User.findOne({ mobileNumber });

  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }

  // Convert both to string to avoid type mismatch
  const storedOtp = user.otp?.toString();
  const inputOtp = otp.toString();

  if (!storedOtp || storedOtp !== inputOtp) {
    return next(new ErrorHander("Invalid OTP", 400));
  }

  if (user.otpExpire < Date.now()) {
    return next(new ErrorHander("OTP has expired", 400));
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpire = null;
  await user.save();

  sendToken(user, 200, res); // Send JWT
});


// POST /api/v1/kyc/upload
exports.uploadKYCImages = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const panImage = req.files?.panImage?.[0]?.path || null;
  const gstImage = req.files?.gstImage?.[0]?.path || null;

  if (!panImage) {
    return next(new ErrorHander("PAN image is required", 400));
  }

  let kycRecord = await KYC.findOne({ userId });

  if (kycRecord) {
    // Update if already exists
    kycRecord.panImage = panImage;
    if (gstImage) kycRecord.gstImage = gstImage;
  } else {
    // Create new
    kycRecord = await KYC.create({
      userId,
      panImage,
      gstImage
    });
  }

  await kycRecord.save();

  res.status(200).json({
    success: true,
    message: "KYC images uploaded successfully",
    data: kycRecord,
  });
});

// GET /api/v1/kyc/:userId
exports.getKYCByUser = catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  const kyc = await KYC.findOne({ userId });

  if (!kyc) {
    return next(new ErrorHander("KYC record not found", 404));
  }

  res.status(200).json({
    success: true,
    data: kyc
  });
});


exports.createOrUpdateBankDetails = catchAsyncErrors(async (req, res, next) => {
  const {
    bankName,
    accountType,
    accountNumber,
    ifsc,
    accountHolderName,
  } = req.body;

  const userId = req.user._id;

  let data = {
    userId,
    bankName,
    accountType,
    accountNumber,
    ifsc,
    accountHolderName,
  };

  if (req.file) {
    data.passbookImage = req.file.path;
  }

  const existing = await BankDetails.findOne({ userId });

  let bankDetails;

  if (existing) {
    bankDetails = await BankDetails.findOneAndUpdate({ userId }, data, {
      new: true,
      runValidators: true,
    });
  } else {
    bankDetails = await BankDetails.create(data);
  }

  res.status(200).json({
    success: true,
    message: "Bank details saved successfully",
    data: bankDetails,
  });
});

exports.getBankDetails = catchAsyncErrors(async (req, res, next) => {
  const bankDetails = await BankDetails.findOne({ userId: req.user._id });

  if (!bankDetails) {
    return next(new ErrorHandler("Bank details not found", 404));
  }

  res.status(200).json({
    success: true,
    data: bankDetails,
  });
});


// Logout user
exports.logout = catchAsyncErrors(async (req, res, next) => {
    res.header("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
});

// Get Single User Details
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    res.status(200).json({
        success: true,
        user
    });
});

exports.getAllSellers = catchAsyncErrors(async (req, res, next) => {
    // Adjust the field name 'role' and value 'seller' based on your schema
    const sellers = await User.find();

    res.status(200).json({
        success: true,
        sellers,
        count: sellers.length
    });
});

//Update UserProfile
// exports.updateShopProfile = catchAsyncErrors(async (req, res, next) => {
//   const {
//     shopName,
//     gstinNumber,
//     ownerName,
//     email,
//     mobileNumber,
//     shopTime,
//     location
//   } = req.body;

//   const shop = await User.findById(req.params.id); // assuming User is your Shop model
//   if (!shop) {
//     return next(new ErrorHander("Shop not found", 404));
//   }

//   if (shopName) shop.shopName = shopName;
//   if (gstinNumber) shop.gstinNumber = gstinNumber;
//   if (ownerName) shop.ownerName = ownerName;
//   if (email) shop.email = email;
//   if (mobileNumber) shop.mobileNumber = mobileNumber;
//   if (shopTime) shop.shopTime = shopTime;
//   if (location) shop.location = location;

//   if (req.file && req.file.path) {
//     shop.image = req.file.path;
//   }

//   await shop.save();

//   res.status(200).json({
//     success: true,
//     message: "Shop profile updated successfully!",
//     shop
//   });
// });


exports.updateShopProfile = catchAsyncErrors(async (req, res, next) => {
  const {
    shopName,
    gstinNumber,
    ownerName,
    email,
    mobileNumber,
    shopTime,
    location,
    pickup  // <-- added this
  } = req.body;

  const shop = await User.findById(req.params.id); // assuming User is your Shop model
  if (!shop) {
    return next(new ErrorHander("Shop not found", 404));
  }

  if (shopName) shop.shopName = shopName;
  if (gstinNumber) shop.gstinNumber = gstinNumber;
  if (ownerName) shop.ownerName = ownerName;
  if (email) shop.email = email;
  if (mobileNumber) shop.mobileNumber = mobileNumber;
  if (shopTime) shop.shopTime = shopTime;
  if (location) shop.location = location;

  if (typeof pickup !== 'undefined') {
    shop.pickup = pickup;  // <-- add pickup field update
  }

  if (req.file && req.file.path) {
    shop.image = req.file.path;
  }

  await shop.save();

  res.status(200).json({
    success: true,
    message: "Shop profile updated successfully!",
    shop
  });
});



// -------------------------- Delete User --------------------------
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHander("User not found", 404));
    }

    await user.deleteOne();

    res.status(200).json({
        success: true,
        message: "User deleted successfully!",
    });
});


// // Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHander("User not found", 404));
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // valid for 10 minutes
    await user.save({ validateBeforeSave: false });

    const message = `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset OTP",
        message,
      });

      res.status(200).json({
        success: true,
        message: `OTP sent to ${user.email} successfully`,
      });
    } catch (error) {
      console.error("Email send error:", error);
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorHander("Failed to send OTP email", 500));
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return next(new ErrorHander(error.message || "Internal Server Error", 500));
  }
});


// Reset Password  
exports.verifyOtpAndResetPassword = catchAsyncErrors(async (req, res, next) => {
    const { otp, password, confirmPassword } = req.body;

    if (!otp || !password || !confirmPassword) {
        return next(new ErrorHander("All fields are required", 400));
    }

    // Find user by OTP and check if OTP is not expired
    const user = await User.findOne({
        otp,
        otpExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(new ErrorHander("Invalid or expired OTP", 400));
    }

    if (password !== confirmPassword) {
        return next(new ErrorHander("Passwords do not match", 400));
    }

    user.password = password;
    user.otp = undefined;
    user.otpExpire = undefined;

    await user.save();

    res.status(200).json({
        success: true,
        message: "Password reset successful",
    });
});



exports.rateShop = catchAsyncErrors(async (req, res) => {
  const { shopId } = req.params;
  const { rating } = req.body;
  const userId = req.customer?.id || req.customer?.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
  }

  const shop = await User.findById(shopId);
  if (!shop) {
    return res.status(404).json({ success: false, message: "Shop not found" });
  }

  // Check if the user already rated
  const existingRating = shop.ratings.find(r => r.userId.toString() === userId.toString());
  if (existingRating) {
    return res.status(400).json({ success: false, message: "You already rated this shop." });
  }

  // Add new rating
  shop.ratings.push({ userId, rating });

  // Update averageRating and totalReviews
  shop.totalReviews = shop.ratings.length;
  shop.averageRating =
    shop.ratings.reduce((acc, r) => acc + r.rating, 0) / shop.totalReviews;

  await shop.save();

  res.status(200).json({
    success: true,
    message: "Shop rated successfully",
    averageRating: shop.averageRating,
    totalReviews: shop.totalReviews
  });
});



exports.getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    // 🟢 Get ALL orders that have seller's products (status != CANCELLED)
    const allOrders = await Order.find({
      status: { $ne: "CANCELLED" },
      "items.productId": { $exists: true }
    }).populate("items.productId");

    let totalSalesToday = 0;
    let todayOrderCount = 0;
    let totalSalesThisMonth = 0;
    let totalItemsSold = 0;
    let totalDeliveredOrders = 0;
    let totalTodayFinals = [];

    for (const order of allOrders) {
      let hasSellerProduct = false;
      let orderFinalAmount = 0;
      let sellerItemsInOrder = 0;

      for (const item of order.items) {
        if (item?.productId?.createdBy?.toString() === sellerId.toString()) {
          hasSellerProduct = true;
          orderFinalAmount += item.price * item.quantity;
          totalItemsSold += item.quantity;
          sellerItemsInOrder++;
        }
      }

      if (!hasSellerProduct) continue;

      const orderDate = new Date(order.createdAt);

      // 💰 Add to Today’s Sales
      if (orderDate >= startOfToday && orderDate <= endOfToday) {
        totalSalesToday += orderFinalAmount;
        todayOrderCount++;
        totalTodayFinals.push(orderFinalAmount);
      }

      // 💰 Add to Month’s Sales
      if (orderDate >= startOfMonth && orderDate <= endOfMonth) {
        totalSalesThisMonth += orderFinalAmount;
      }

      // ✅ Delivered Orders Count
      if (order.status === "DELIVERED") {
        totalDeliveredOrders++;
      }
    }

    const averageOrderValueToday =
      totalTodayFinals.length > 0
        ? (totalTodayFinals.reduce((sum, val) => sum + val, 0) / totalTodayFinals.length)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalSalesToday: totalSalesToday.toFixed(2),
        totalSalesThisMonth: totalSalesThisMonth.toFixed(2),
        todayOrderCount,
        averageOrderValueToday: averageOrderValueToday.toFixed(2),
        totalDeliveredOrders,
        totalItemsSold
      }
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getSellerYearlyRevenue = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const year = parseInt(req.query.year);

    if (!year || isNaN(year)) {
      return res.status(400).json({ success: false, message: "Invalid year" });
    }

    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const orders = await Order.find({
      createdAt: { $gte: startOfYear, $lte: endOfYear },
      status: "DELIVERED"
    }).populate("items.productId");

    const monthlyRevenue = Array(12).fill(0);
    let totalRevenue = 0;
    let deliveredOrderCount = 0;

    orders.forEach(order => {
      let sellerRevenue = 0;
      let hasSellerProduct = false;

      order.items.forEach(item => {
        if (item.productId?.createdBy?.toString() === sellerId.toString()) {
          hasSellerProduct = true;
          sellerRevenue += item.price * item.quantity;
        }
      });

      if (hasSellerProduct) {
        const monthIndex = new Date(order.createdAt).getMonth(); // 0 = Jan, 11 = Dec
        monthlyRevenue[monthIndex] += sellerRevenue;
        totalRevenue += sellerRevenue;
        deliveredOrderCount++;
      }
    });

    return res.status(200).json({
      success: true,
      year,
      totalRevenue: totalRevenue.toFixed(2),
      deliveredOrderCount,
      monthlyRevenue: {
        January: monthlyRevenue[0].toFixed(2),
        February: monthlyRevenue[1].toFixed(2),
        March: monthlyRevenue[2].toFixed(2),
        April: monthlyRevenue[3].toFixed(2),
        May: monthlyRevenue[4].toFixed(2),
        June: monthlyRevenue[5].toFixed(2),
        July: monthlyRevenue[6].toFixed(2),
        August: monthlyRevenue[7].toFixed(2),
        September: monthlyRevenue[8].toFixed(2),
        October: monthlyRevenue[9].toFixed(2),
        November: monthlyRevenue[10].toFixed(2),
        December: monthlyRevenue[11].toFixed(2)
      }
    });

  } catch (error) {
    console.error("Yearly Revenue Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getSellerDailyOrderReport = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch today's orders
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate("items.productId");

    // Initialize counters
    let received = 0;
    let accepted = 0;
    let cancelled = 0;

    for (const order of orders) {
      const hasSellerProduct = order.items.some(item => 
        item.productId?.createdBy?.toString() === sellerId.toString()
      );

      if (!hasSellerProduct) continue;

      if (order.status === "PENDING") received++;
      else if (["ACCEPTED", "PROCESSING", "PACKED", "PLACED"].includes(order.status)) accepted++;
      else if (order.status === "CANCELLED") cancelled++;
    }

    return res.status(200).json({
      success: true,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      report: {
        received,
        accepted,
        cancelled
      }
    });

  } catch (error) {
    console.error("Daily Order Report Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// exports.getSellerMonthlyOrderReport = async (req, res) => {
//   try {
//     const sellerId = req.user.id;
//     const { month, year } = req.query;

//     if (!month || !year) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide both 'month' and 'year' as query params"
//       });
//     }

//     const monthInt = parseInt(month) - 1; // JavaScript month is 0-indexed
//     const yearInt = parseInt(year);

//     const startOfMonth = new Date(yearInt, monthInt, 1, 0, 0, 0);
//     const endOfMonth = new Date(yearInt, monthInt + 1, 0, 23, 59, 59, 999);

//     const orders = await Order.find({
//       createdAt: { $gte: startOfMonth, $lte: endOfMonth }
//     }).populate("items.productId");

//     let received = 0;
//     let accepted = 0;
//     let cancelled = 0;

//     for (const order of orders) {
//       const hasSellerProduct = order.items.some(item =>
//         item.productId?.createdBy?.toString() === sellerId.toString()
//       );

//       if (!hasSellerProduct) continue;

//       if (order.status === "PENDING") received++;
//       else if (["ACCEPTED", "PROCESSING", "PACKED", "PLACED"].includes(order.status)) accepted++;
//       else if (order.status === "CANCELLED") cancelled++;
//     }

//     return res.status(200).json({
//       success: true,
//       reportMonth: `${month}-${year}`,
//       report: {
//         received,
//         accepted,
//         cancelled
//       }
//     });

//   } catch (error) {
//     console.error("Monthly Order Report Error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

exports.getSellerMonthlyOrderReport = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate("items.productId");

    let received = 0;
    let accepted = 0;
    let cancelled = 0;

    for (const order of orders) {
      const hasSellerProduct = order.items.some(item =>
        item.productId?.createdBy?.toString() === sellerId.toString()
      );

      if (!hasSellerProduct) continue;

      if (order.status === "PENDING") received++;
      else if (["ACCEPTED", "PROCESSING", "PACKED", "PLACED"].includes(order.status)) accepted++;
      else if (order.status === "CANCELLED") cancelled++;
    }

    return res.status(200).json({
      success: true,
      reportMonth: `${now.getMonth() + 1}-${now.getFullYear()}`,
      report: {
        received,
        accepted,
        cancelled
      }
    });

  } catch (error) {
    console.error("Monthly Order Report Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//wallet

// exports.getSellerWalletSummary = async (req, res) => {
//   try {
//     const sellerId = req.user.id;

//     // Orders where seller has products
//     const orders = await Order.find({
//       "items.productId": { $exists: true },
//       status: { $in: ["DELIVERED", "PENDING", "PLACED", "ACCEPTED", "PACKED"] }
//     }).populate("items.productId");

//     let walletBalance = 0;
//     let upcomingPaymentsAmount = 0;

//     for (const order of orders) {
//       const sellerItems = order.items.filter(
//         item => item.productId?.createdBy?.toString() === sellerId.toString()
//       );

//       if (sellerItems.length === 0) continue;

//       const amount = sellerItems.reduce((sum, item) => {
//         return sum + item.quantity * item.price;
//       }, 0);

//       if (order.status === "DELIVERED") {
//         walletBalance += amount;
//       } else {
//         upcomingPaymentsAmount += amount;
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       walletBalance: walletBalance.toFixed(2), // earned
//       upcomingPaymentsAmount: upcomingPaymentsAmount.toFixed(2) // expected
//     });

//   } catch (error) {
//     console.error("Wallet summary error:", error);
//     return res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

exports.getSellerWalletSummarythru = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // 🟢 Get orders where seller has products
    const orders = await Order.find({
      "items.productId": { $exists: true },
      status: { $in: ["DELIVERED", "PENDING", "PLACED", "ACCEPTED", "PACKED"] }
    }).populate("items.productId");

    let walletBalance = 0; // earned sales
    let upcomingPaymentsAmount = 0; // pending sales

    for (const order of orders) {
      const sellerItems = order.items.filter(
        item => item.productId?.createdBy?.toString() === sellerId.toString()
      );

      if (sellerItems.length === 0) continue;

      const amount = sellerItems.reduce((sum, item) => {
        return sum + item.quantity * item.price;
      }, 0);

      if (order.status === "DELIVERED") {
        walletBalance += amount;
      } else {
        upcomingPaymentsAmount += amount;
      }
    }

    // 🟢 Get total referral earnings for seller
    const referralTxns = await ReferralTransaction.find({ referrer: sellerId });
    const referralEarnings = referralTxns.reduce((sum, tx) => sum + tx.amount, 0);

    // 🟢 Combine product sales + referral earnings
    const totalWalletBalance = walletBalance + referralEarnings;

    return res.status(200).json({
      success: true,
      walletBalance: totalWalletBalance.toFixed(2), // Total earned: sales + referrals
      referralEarnings: referralEarnings.toFixed(2),
      productSalesEarnings: walletBalance.toFixed(2),
      upcomingPaymentsAmount: upcomingPaymentsAmount.toFixed(2)
    });

  } catch (error) {
    console.error("Wallet summary error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getSellerWalletSummary = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // 🟢 Fetch all relevant orders
    const orders = await Order.find({
      "items.productId": { $exists: true },
      status: { $in: ["DELIVERED", "PENDING", "PLACED", "ACCEPTED", "PACKED"] }
    }).populate("items.productId");

    let walletBalance = 0;               // Total from DELIVERED items
    let upcomingPaymentsAmount = 0;      // Total from non-DELIVERED items
    let commissionEarned = 0;            // 10% on all items (regardless of status)

    for (const order of orders) {
      const sellerItems = order.items.filter(
        item => item.productId?.createdBy?.toString() === sellerId.toString()
      );

      if (sellerItems.length === 0) continue;

      for (const item of sellerItems) {
        const itemTotal = item.quantity * item.price;
        commissionEarned += itemTotal * 0.1; // 10% commission

        if (order.status === "DELIVERED") {
          walletBalance += itemTotal;
        } else {
          upcomingPaymentsAmount += itemTotal;
        }
      }
    }

    // 🟢 Get total referral earnings
    const referralTxns = await ReferralTransaction.find({ referrer: sellerId });
    const referralEarnings = referralTxns.reduce((sum, tx) => sum + tx.amount, 0);

    // 🟢 Total balance = sales + referral
    const totalWalletBalance = walletBalance + referralEarnings;

    // ✅ Return final response
    return res.status(200).json({
      success: true,
      walletBalance: totalWalletBalance.toFixed(2),          // Total (sales + referral)
      productSalesEarnings: walletBalance.toFixed(2),        // Sales from delivered
      referralEarnings: referralEarnings.toFixed(2),         // Referral total
      upcomingPaymentsAmount: upcomingPaymentsAmount.toFixed(2), // Pending orders
      commissionEarned: commissionEarned.toFixed(2)          // 10% commission
    });

  } catch (error) {
    console.error("Wallet summary error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.getUpcomingPayouts = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Fetch all active orders for this seller with relevant statuses
    const orders = await Order.find({
      status: { $in: ["PENDING", "PLACED", "ACCEPTED", "PACKED"] },
      "items.productId": { $exists: true }
    }).populate("items.productId");

    const payouts = [];

    for (const order of orders) {
      const sellerItems = order.items.filter(
        item => item.productId?.createdBy?.toString() === sellerId.toString()
      );

      if (sellerItems.length === 0) continue;

      const amount = sellerItems.reduce((sum, item) => {
        return sum + item.quantity * item.price;
      }, 0);

      payouts.push({
        orderId: order._id,
        date: order.createdAt,
        amount: amount.toFixed(2)
      });
    }

    return res.status(200).json({
      success: true,
      count: payouts.length,
      payouts
    });

  } catch (error) {
    console.error("Error in getUpcomingPayouts:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getLastTransaction = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Get latest DELIVERED order that includes seller's products
    const latestOrder = await Order.findOne({
      status: "DELIVERED",
      "items.productId": { $exists: true }
    })
      .populate("items.productId")
      .sort({ deliveredAt: -1 });

    if (!latestOrder) {
      return res.status(404).json({
        success: false,
        message: "No transactions found"
      });
    }

    // Filter out items sold by this seller
    const sellerItems = latestOrder.items.filter(
      item => item.productId?.createdBy?.toString() === sellerId.toString()
    );

    if (sellerItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this seller"
      });
    }

    // Calculate amount earned from that order
    const amount = sellerItems.reduce((sum, item) => {
      return sum + item.quantity * item.price;
    }, 0);

    return res.status(200).json({
      success: true,
      data: {
        orderId: latestOrder._id,
        orderNumber: latestOrder.orderNumber,
        orderDate: latestOrder.deliveredAt || latestOrder.updatedAt,
        amount: amount.toFixed(2)
      }
    });

  } catch (error) {
    console.error("Error fetching last transaction:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getSellerCommissionHistory = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // 🟢 Get all orders where products exist and have valid statuses
    const orders = await Order.find({
      "items.productId": { $exists: true },
      status: { $in: ["DELIVERED", "PENDING", "PLACED", "ACCEPTED", "PACKED"] }
    }).populate("items.productId");

    const commissionHistory = [];

    for (const order of orders) {
      const sellerItems = order.items.filter(
        item => item.productId?.createdBy?.toString() === sellerId.toString()
      );

      if (sellerItems.length === 0) continue;

      for (const item of sellerItems) {
        const itemAmount = item.quantity * item.price;
        const commissionAmount = itemAmount * 0.1;

        commissionHistory.push({
          orderId: order._id,
          date: order.createdAt,
          status: order.status,
          itemAmount: itemAmount.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2)
        });
      }
    }

    // ✅ Return final response
    return res.status(200).json({
      success: true,
      commissionHistory
    });

  } catch (error) {
    console.error("Commission history error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
