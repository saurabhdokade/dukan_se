// controllers/adminController.js
const User = require("../model/adminModel");
const sendToken = require("../utils/jwtToken");
const crypto = require("crypto");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHander = require("../utils/errorhandler");
const Customer = require("../model/customerModel");
const Order = require("../model/orderModel");
const GullakHistory = require("../model/GullakHistoryModel");
const Shop = require("../model/userModel");
const Product = require("../model/productModel");
const Notification = require("../model/notificationModel");
const HelpSupport = require("../model/helpsupportModel");
const SupportMessage = require("../model/supportMessageModel");
const Offer = require("../model/offerModel");
const ReferralTransaction = require("../model/ReferralTransactionModel");
const moment = require("moment")

// ✅ Register
exports.registerAdmin = async (req, res) => {
    try {
        const {
            fullname,
            username,
            gender,
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: "Admin with this email already exists." });
        }

        const admin = await User.create({
            fullname,
            username,
            gender,
            email,
            password,
            role: "ADMIN"
        });

        sendToken(admin, 201, res);
    } catch (error) {
        console.error("Register Admin Error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

// ✅ Login
exports.loginAdmin = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorHander("Please enter email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        return next(new ErrorHander("Invalid email or password", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
        return next(new ErrorHander("Invalid email or password", 401));
    }

    sendToken(user, 200, res);

});

// ✅ Get Own Profile
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findById(req.admin.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found." });
        }
        res.status(200).json({ success: true, admin });
    } catch (error) {
        console.error("Get Admin Profile Error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};


// ✅ PATCH /api/v1/admin/update-profile
exports.updateAdminProfile = catchAsyncErrors(async (req, res, next) => {
  const { fullname, username, email, phoneNumber, gender } = req.body;

  // ✅ Use the logged-in admin ID from your auth middleware
  const admin = await User.findById(req.admin.id);
  if (!admin) {
    return next(new ErrorHander("Admin not found", 404));
  }

  // ✅ Update fields if provided
  if (fullname) admin.fullname = fullname;
  if (username) admin.username = username;
  if (email) admin.email = email;
  if (phoneNumber) admin.phoneNumber = phoneNumber;
  if (gender) admin.gender = gender;

  // ✅ Update profile image if uploaded
  if (req.file) {
    admin.userProfile = req.file.path; // or .location for S3
  }

  await admin.save();

  res.status(200).json({
    success: true,
    message: "Admin profile updated successfully!",
    admin,
  });
});



//get all customers


exports.getAllCustomers = catchAsyncErrors(async (req, res, next) => {
  try {
    const filterType = req.query.filter;

    let query = {};

    if (filterType === "new") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.registrationDate = { $gte: thirtyDaysAgo };
    }

    // ✅ Build base query
    let customerQuery = Customer.find(
      query,
      "name phoneNumber location status registrationDate"
    );

    // ✅ Apply sort ONLY for filter=new
    if (filterType === "new") {
      customerQuery = customerQuery.sort({ registrationDate: -1 });
    }

    const customers = await customerQuery;

    const results = [];

    for (const customer of customers) {
      // Delivered orders
      const orders = await Order.find({
        userId: customer._id,
        status: "DELIVERED"
      });

      const totalOrders = orders.length;
      const lifetimeValue = orders.reduce((sum, order) => sum + order.finalAmount, 0);

      // Earned coins
      const earnedAgg = await GullakHistory.aggregate([
        { $match: { userId: customer._id, type: "EARNED" } },
        { $group: { _id: null, total: { $sum: "$coins" } } }
      ]);
      const coinsEarned = earnedAgg[0] ? earnedAgg[0].total : 0;

      // Redeemed coins (from orders)
      const redeemedAgg = await Order.aggregate([
        {
          $match: {
            userId: customer._id,
            gullakUsed: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$gullakUsed" }
          }
        }
      ]);
      const coinsRedeemed = redeemedAgg[0] ? redeemedAgg[0].total : 0;

      // Expired coins = earned - redeemed
      let coinsExpired = coinsEarned - coinsRedeemed;
      coinsExpired = coinsExpired > 0 ? coinsExpired : 0;

      results.push({
        _id: customer._id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        location: customer.location,
        status: customer.status,
        registrationDate: customer.registrationDate,
        totalOrders,
        lifetimeValue: lifetimeValue.toFixed(2),
        coinsEarned,
        coinsRedeemed,
        coinsExpired
      });
    }

    return res.status(200).json({
      success: true,
      filter: filterType || "all",
      totalCustomers: results.length,
      customers: results
    });
  } catch (error) {
    console.error("getAllCustomersWithGullakSummary error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching customers"
    });
  }
});

// GET /api/v1/customer/:id/orders
exports.getAllCustomerOrders = catchAsyncErrors(async (req, res, next) => {
  const customerId = req.params.id;

  const orders = await Order.find({ userId: customerId }).sort({ createdAt: -1 });

  const formattedOrders = orders.map(order => ({
    _id: order._id,
    orderNumber: order.orderNumber,
    date: order.createdAt,
    status: order.status,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    coinsUsed: order.gullakUsed || 0,
    netRevenue: (order.finalAmount || 0).toFixed(2)
  }));

  return res.status(200).json({
    success: true,
    totalOrders: formattedOrders.length,
    orders: formattedOrders
  });
});


exports.getOrderDetails = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;

  // 1️⃣ Find order by ID with product details
  const order = await Order.findById(orderId)
    .populate({
      path: "items.productId",
      select: "productName productPhotoFront createdBy"
    });

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  // 2️⃣ Get customer details
  const customer = await Customer.findById(order.userId).select(
    "name phoneNumber email location.formattedAddress"
  );

  // 3️⃣ Get shop details from first product
  const firstProduct = order.items[0]?.productId;
  const shopId = firstProduct?.createdBy;

  const shop = await Shop.findById(shopId).select(
    "shopName mobileNumber location.formattedAddress"
  );

  // 4️⃣ Format response
  const response = {
    orderDetails: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      deliveryType: order.deliveryType,
      orderStatus: order.status
    },

    customerDetails: {
      name: customer?.name || "",
      phoneNumber: customer?.phoneNumber || "",
      email: customer?.email || "",
      address: customer?.location?.formattedAddress || ""
    },

    shopDetails: {
      storeName: shop?.shopName || "",
      mobileNumber: shop?.mobileNumber || "",
      address: shop?.location?.formattedAddress || ""
    },

    products: order.items.map(item => ({
      name: item.productId?.productName || "",
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
    data: response
  });
});
// GET /api/v1/customer/:id/details
// GET /api/v1/customer/:id/details
exports.getCustomerDetails = catchAsyncErrors(async (req, res, next) => {
  const customerId = req.params.id;

  const customer = await Customer.findById(customerId).lean();

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found"
    });
  }

  // Get ONLY the most recent order
  const latestOrder = await Order.findOne({ userId: customer._id })
    .sort({ createdAt: -1 })
    .populate("items.productId", "name")
    .lean();

  let latestOrderDetails = null;

  if (latestOrder) {
    latestOrderDetails = {
      orderNumber: latestOrder.orderNumber,
      status: latestOrder.status,
      finalAmount: latestOrder.finalAmount,
      createdAt: latestOrder.createdAt,
      deliveryType: latestOrder.deliveryType,
      items: latestOrder.items.map(item => ({
        productId: item.productId?._id,
        productName: item.productId?.name || "Unknown Product",
        quantity: item.quantity,
        price: item.price
      }))
    };
  }

  return res.status(200).json({
    success: true,
    customer: {
      name: customer.name,
      dateOfBirth: customer.dateOfBirth,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      address: customer.address,
      location: customer.location
    },
    latestOrder: latestOrderDetails
  });
});



exports.updateCustomerProfile = catchAsyncErrors(async (req, res, next) => {
    const {
        name,
        email,
        phoneNumber,
        dateOfBirth,
        location

    } = req.body;

    const user = await Customer.findById(req.params.id);
    if (!user) {
        return next(new ErrorHander("User not found", 404));
    }
    if (name) user.name = name;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (location) user.location = location;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (email) user.email = email;
    if (req.file) {
        user.userProfile = req.file.path; // S3 puts the file URL in .location
    }
    // Save the updated user
    await user.save();

    res.status(200).json({
        success: true,
        message: "User details updated successfully!",
        user,
    });
});

//shop
exports.getAllShops = catchAsyncErrors(async (req, res) => {
  const { filter } = req.query;

  let dateFilter = {};
  if (filter) {
    const now = new Date();
    let start, end;

    if (filter === "thisweek") {
      // Start of week (Monday)
      const day = now.getDay(); // 0 (Sun) - 6 (Sat)
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
    } else if (filter === "thismonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
    } else if (filter === "thisyear") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid filter. Use thisweek, thismonth, or thisyear."
      });
    }

    dateFilter = { createdAt: { $gte: start, $lte: end } };
  }

  // 👉 Find shops with optional date filter
  const shops = await Shop.find({ role: "USER", ...dateFilter })
    .select("shopName ownerName mobileNumber email isVerified createdAt gullakPoints referralCode referredBy");

  const results = [];

  for (const shop of shops) {
    // 🔍 Find all products created by this shop
    const products = await Product.find({ createdBy: shop._id }).select("_id");
    const productIds = products.map(p => p._id);

    // 🔍 Find all DELIVERED orders for these products
    const orders = await Order.find({
      "items.productId": { $in: productIds },
      status: "DELIVERED"
    });

    const totalOrdersFulfilled = orders.length;

    // 🕒 Average order time: deliveredAt - createdAt
    let totalMinutes = 0;
    orders.forEach(order => {
      if (order.deliveredAt && order.createdAt) {
        const diffMs = order.deliveredAt - order.createdAt;
        totalMinutes += diffMs / (1000 * 60);
      }
    });

    const avgOrderTimeMinutes = totalOrdersFulfilled ? (totalMinutes / totalOrdersFulfilled).toFixed(2) : 0;

    // 📈 Referral conversion
    const referrals = await Shop.countDocuments({ referredBy: shop._id });

    results.push({
      _id: shop._id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      mobileNumber: shop.mobileNumber,
      email: shop.email,
      status: shop.isVerified ? "Active" : "Inactive",
      registrationDate: shop.createdAt,
      totalOrdersFulfilled,
      avgOrderTimeMinutes,
      referralConversion: referrals,
      coinsEarned: shop.gullakPoints || 0
    });
  }

  res.status(200).json({
    success: true,
    filterApplied: filter || "none",
    totalShops: results.length,
    shops: results
  });
});


exports.getShopDetails = catchAsyncErrors(async (req, res) => {
  const { shopId } = req.params;

  const shop = await Shop.findById(shopId).select(
    "image shopName ownerName gstinNumber mobileNumber email location.formattedAddress shopTime"
  );

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: "Shop not found."
    });
  }

  res.status(200).json({
    success: true,
    shop: {
      image: shop.image || null,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      gstinNumber: shop.gstinNumber,
      mobileNumber: shop.mobileNumber,
      email: shop.email,
      address: shop.location?.formattedAddress || "",
      shopTime: {
        openingTime: shop.shopTime?.openingTime || "",
        closingTime: shop.shopTime?.closingTime || ""
      }
    }
  });
});

exports.updateShopProfile = catchAsyncErrors(async (req, res, next) => {
  const {
    shopName,
    gstinNumber,
    ownerName,
    email,
    mobileNumber,
    shopTime,
    location
  } = req.body;

  const shop = await Shop.findById(req.params.id); // assuming User is your Shop model
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

exports.updateShopStatus = catchAsyncErrors(async (req, res) => {
  const { shopId } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Allowed values are: approved, rejected."
    });
  }

  const shop = await Shop.findById(shopId);
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: "Shop not found."
    });
  }

  shop.status = status;
  await shop.save();

  res.status(200).json({
    success: true,
    message: `Shop has been ${status}.`,
    shop: {
      id: shop._id,
       image: shop.image || null,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      gstinNumber: shop.gstinNumber,
      mobileNumber: shop.mobileNumber,
      email: shop.email,
      address: shop.location?.formattedAddress || "",
      shopTime: {
        openingTime: shop.shopTime?.openingTime || "",
        closingTime: shop.shopTime?.closingTime || ""
      },
      status: shop.status
    }
  });
});

async function generateUniqueReferralCode(prefix = "SHOP") {
  let code;
  let exists = true;

  while (exists) {
    code = `${prefix}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    exists = await User.findOne({ referralCode: code });
  }

  return code;
}
exports.registerNewShop = async (req, res, next) => {
  try {
    const {
      shopName, gstinNumber, ownerName, mobileNumber, password,
      referralCode, image, shopTime, location
    } = req.body;

    if (!mobileNumber || !password) {
      return next(new ErrorHander("Mobile number and password are required", 400));
    }

    const existingShop = await Shop.findOne({ mobileNumber });
    if (existingShop) {
      return next(new ErrorHander("Shop with this mobile number already exists", 400));
    }

    let referredByShop = null;
    if (referralCode) {
      referredByShop = await Shop.findOne({ referralCode });
      if (!referredByShop) {
        return next(new ErrorHander("Invalid referral code", 400));
      }
    }

    // ✅ SAFE: Generate unique referral code BEFORE create
    const uniqueReferralCode = await generateUniqueReferralCode("SHOP");

    const newShop = await Shop.create({
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


//products
exports.getAllProducts = catchAsyncErrors(async (req, res) => {
  const products = await Product.find()
    .select("productName price unitsAvailable productPhotoFront");

  res.status(200).json({
    success: true,
    totalProducts: products.length,
    products
  });
});


// GET /api/v1/product/:productId
exports.getProductDetails = catchAsyncErrors(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId).select(
    "productPhotoFront productPhotoBack productName price packOf brand productType netWeight shelfLife nutrientContent productDescription"
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found"
    });
  }

  res.status(200).json({
    success: true,
    product: {
      id: product._id,
      frontImage: product.productPhotoFront,
      backImage: product.productPhotoBack,
      name: product.productName,
      price: product.price,
      packOf: product.packOf,
      brand: product.brand,
      type: product.productType,
      netWeight: product.netWeight,
      shelfLife: product.shelfLife,
      nutrientContent: product.nutrientContent,
      productDescription: product.productDescription
    }
  });
});


exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;

  // 🔍 Find product by ID
  const product = await Product.findById(productId);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  // ✅ Apply updates from body
  const updates = {
    productName: req.body.productName || product.productName,
    price: req.body.price || product.price,
    productType: req.body.productType || product.productType,
    brand: req.body.brand || product.brand,
    packOf: req.body.packOf || product.packOf,
    netWeight: req.body.netWeight || product.netWeight,
    shelfLife: req.body.shelfLife || product.shelfLife,
    nutrientContent: req.body.nutrientContent || product.nutrientContent,
    productDescription: req.body.productDescription || product.productDescription,
    unitsAvailable: req.body.unitsAvailable || product.unitsAvailable,
    isActive: req.body.isActive !== undefined ? req.body.isActive : product.isActive
  };

  // ✅ Handle uploaded images
  if (req.files?.front?.[0]?.path) {
    updates.productPhotoFront = req.files.front[0].path;
  }

  if (req.files?.back?.[0]?.path) {
    updates.productPhotoBack = req.files.back[0].path;
  }

  // 📝 Update fields
  Object.assign(product, updates);
  await product.save();

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    product,
  });
});

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

  // ✅ Must be admin
  if (!req.admin || !req.admin._id) {
    return next(new ErrorHander("Admin authentication failed.", 401));
  }

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
    createdByadmin: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    product,
  });
});


//get all orders

exports.getAllOrders = catchAsyncErrors(async (req, res) => {
  try {
    const filter = req.query.filter; // e.g., ?filter=delivered
    const query = {};

    if (filter) {
      switch (filter.toLowerCase()) {
        case "delivered":
          query.status = "DELIVERED";
          break;
        case "cancelled":
          query.status = "CANCELLED";
          break;
        case "inprocess":
          query.status = { $in: ["ACCEPTED", "PROCESSING", "PACKED", "PLACED"] };
          break;
        default:
          // Do nothing, show all orders
          break;
      }
    }

    const orders = await Order.find(query)
      .populate("userId", "name phoneNumber")
      .populate({
        path: "items.productId",
        select: "createdBy",
        populate: { path: "createdBy", select: "shopName" }
      })
      .sort({ createdAt: -1 });

    const results = [];

    for (const order of orders) {
      const customer = order.userId;
      const firstProduct = order.items[0]?.productId;
      const shop = firstProduct?.createdBy;

      results.push({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryType: order.deliveryType,
        otp: order.otp,
        paymentMethod: order.paymentMethod,
        razorpayStatus: order.razorpayLinkStatus,
        orderDate: order.createdAt,
        deliveredAt: order.deliveredAt || null,
        cancelDate: order.cancelDate || null,

        customer: {
          name: customer?.name || "",
          phoneNumber: customer?.phoneNumber || ""
        },

        shop: {
          shopName: shop?.shopName || ""
        },

        paymentDetails: {
          totalAmount: order.totalAmount,
          convenienceFee: order.convenienceFee,
          platformFee: order.platformFee,
          gullakUsed: order.gullakUsed,
          finalAmount: order.finalAmount
        }
      });
    }

    res.status(200).json({
      success: true,
      filter: filter || "all",
      totalOrders: results.length,
      orders: results
    });
  } catch (error) {
    console.error("getAllOrders error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching orders"
    });
  }
});


// controller/adminController.js (or paymentsController.js)

exports.getAllPayments = catchAsyncErrors(async (req, res) => {
  try {
    const filterStatus = req.query.status; // optional ?status=success

    let statusFilter = {};

    if (filterStatus) {
      switch (filterStatus.toLowerCase()) {
        case "success":
        case "successful":
          statusFilter.razorpayLinkStatus = "paid"; // or your actual success status
          break;
        case "pending":
          statusFilter.razorpayLinkStatus = { $in: ["created", "upi_qr_generated"] };
          break;
        case "unsuccessful":
        case "failed":
          statusFilter.razorpayLinkStatus = { $in: ["expired", "cancelled"] };
          break;
      }
    }

    const payments = await Order.find(statusFilter)
      .populate("userId", "location") // assuming you have a location field in CustomerAuth
      .sort({ createdAt: -1 });

    const results = payments.map(payment => ({
        _id: payment._id,
      orderId: payment.orderNumber || payment._id,
      location: payment.userId?.location || "N/A",
      status: payment.razorpayLinkStatus === "paid"
        ? "Successfull"
        : payment.razorpayLinkStatus === "created" || payment.razorpayLinkStatus === "upi_qr_generated"
        ? "Pending"
        : "Unsuccessfull",
      dateTime: payment.createdAt
    }));

    res.status(200).json({
      success: true,
      totalPayments: results.length,
      _id: orders._id,
      payments: results
    });

  } catch (error) {
    console.error("getAllPayments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payments"
    });
  }
});

// controller/paymentController.js

exports.getPaymentDetails = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;

  // Find the order by its orderNumber or _id
  const order = await Order.findOne({ _id: orderId })
    .populate("userId", "name");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Payment / Order not found"
    });
  }

  res.status(200).json({
    success: true,
    payment: {
      orderId: order.orderNumber,
      customerName: order.userId?.name || "N/A",
      date: order.createdAt,
      transactionId: order.razorpayPaymentId || order.razorpayOrderId || "N/A",
      paymentMode: "Online",
      totalAmount: order.finalAmount,
      status: order.razorpayLinkStatus === "paid" ? "Paid" : "Pending"
    }
  });
});


//term and privacy
const {
  TermsAndConditionsModel,
  PrivacyPolicyModel,
  AboutUsModel,
} = require("../model/seetingModel");


//✅ isEmpty Function
const isEmpty = (value) =>
  !value || (Array.isArray(value) && value.length === 0);
 
 
//✅ Create Terms and Conditions
exports. createTerms = async (req, res) => {
  const { description } = req.body;
  if (isEmpty(description)) {
    return res.status(400).json({ message: "Description is required" });
  }
 
  try {
    const exists = await TermsAndConditionsModel.findOne();
    if (exists) return res.status(400).json({ message: "Terms already exist" });
 
    const data = await TermsAndConditionsModel.create({ description });
   return res.status(201).json({
    success: true,
    message: "Terms and Conditions created successfully",
    data
  });
  } catch (err) {
    return res.status(500).json({ success:false, error: err.message });
  }
};
    
 
//✅ Get Terms and Conditions
exports. getTerms = async (req, res) => {
  try {
    const data = await TermsAndConditionsModel.findOne();
   return res.status(200).json({
    success:true,
    message:"Terms and Conditions fetched successfully",
    data
  });
  } catch (err) {
    return res.status(500).json({ success:false, error: err.message });
  }
};
 

//✅ Update Terms and Conditions
exports. updateTerms = async (req, res) => {
  const { description } = req.body;
  if (isEmpty(description)) {
    return res.status(400).json({ message: "Description is required" });
  }
 
  try {
    const updated = await TermsAndConditionsModel.findOneAndUpdate(
      {},
      { description },
      { new: true }
    );
   return res.status(200).json({
    success: true,
    message: "Terms and Conditions updated successfully",
    updated
  });
  } catch (err) {
    return res.status(500).json({ success:false, error: err.message });
  }
};
 

//✅ Create Privacy Policy
exports. createPrivacy = async (req, res) => {
  const { description } = req.body;
  if (isEmpty(description)) {
    return res.status(400).json({ message: "Description is required" });
  }
 
  try {
    const exists = await PrivacyPolicyModel.findOne();
    if (exists)
      return res.status(400).json({ message: "Privacy policy already exists" });
 
    const data = await PrivacyPolicyModel.create({ description });
   return  res.status(201).json({
    success:true,
    message:"Privacy policy created successfully",
    data
  });
  } catch (err) {
    return res.status(500).json({ success:false, error: err.message });
  }
};
 
//✅ Get Privacy Policy
exports. getPrivacy = async (req, res) => {
  try {
    const data = await PrivacyPolicyModel.findOne();
   return res.status(200).json({
      success:true,
      message:"Privacy policy fetched successfully",
      data
    });
  } catch (err) {
   return res.status(500).json({ success:false, error: err.message });
  }
};
 
//✅ Update Privacy Policy
exports. updatePrivacy = async (req, res) => {
  const { description } = req.body;
  if (isEmpty(description)) {
    return res.status(400).json({ message: "Description is required" });
  }
 
  try {
    const updated = await PrivacyPolicyModel.findOneAndUpdate(
      {},
      { description },
      { new: true }
    );
   return res.status(200).json({
    success: true,
    message: "Privacy policy updated successfully",
    updated
  });
  } catch (err) {
    return res.status(500).json({ success:false, error: err.message });
  }
};


// ✅ GET ALL Notifications (no auth required)
exports.getAllNotifications = catchAsyncErrors(async (req, res) => {
  const { type } = req.query; // e.g., ?type=ORDER

  let filter = {};
  if (type) {
    filter.type = type.toUpperCase(); // Ensure case match with enum ["ORDER","GULLAK",...]
  }

  const notifications = await Notification.find(filter)
    .populate({
      path: "user",
      select: "name phoneNumber userProfile shopName",
    })
    .populate({
      path: "orderId",
      select: "orderNumber status",
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    filter: type || "ALL",
    total: notifications.length,
    notifications,
  });
});

// 👉 Send Notification (Admin only)
exports.sendNotification = catchAsyncErrors(async (req, res, next) => {
  const { userId, userType, title, message,type } = req.body;

  // Basic validation
  if (!userId || !userType || !title || !message) {
    return next(new ErrorHandler("userId, userType, title, and message are required", 400));
  }

  // Create notification
  const notification = await Notification.create({
    user: userId,
    userType,                // "CustomerAuth" or "UsersAuth"
    title,
    message,
    type: type || "SYSTEM",  // Default to SYSTEM if not provided
  });

  res.status(201).json({
    success: true,
    message: "Notification sent successfully",
    notification
  });
});

// ✅ Get all help & support tickets with basic details
exports.getAllHelpSupportTickets = catchAsyncErrors(async (req, res) => {
  const tickets = await HelpSupport.find({})
    .populate({
      path: "userId",
      select: "name phoneNumber"
    })
    .populate({
      path: "faqId",
      select: "question"
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    totalTickets: tickets.length,
    tickets
  });
});

exports.getSupportMessagesByTicket = catchAsyncErrors(async (req, res) => {
  const { ticketId } = req.params;

  const messages = await SupportMessage.find({ ticketId }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    totalMessages: messages.length,
    messages
  });
});


exports.resolveTicket = catchAsyncErrors(async (req, res) => {
  const { ticketId } = req.params;
  const { responseMessage, status } = req.body;

  if (!["RESOLVED", "CLOSED"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const ticket = await HelpSupport.findOne({ ticketId });
  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found" });
  }

  ticket.status = status;
  await ticket.save();

  if (responseMessage) {
    await SupportMessage.create({
      ticketId,
      senderType: "USER",
      message: responseMessage
    });
  }

  res.status(200).json({
    success: true,
    message: "Ticket updated",
    ticket
  });
});

//offer

// controllers/offerController.js
// exports.createOffer = catchAsyncErrors(async (req, res) => {
//   const {
//     userType,
//     userId,
//     products,
//     discountRate,
//     discountAmount,
//     offerStartDate,
//     offerExpireDate,
//     offerText
//   } = req.body;

//   if (
//     !userType || 
//     !userId || 
//     !products || products.length === 0 ||
//     !offerStartDate || 
//     !offerExpireDate || 
//     !offerText
//   ) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing required fields"
//     });
//   }

//   const bannerImage = req.file?.path || null;

//   const offer = await Offer.create({
//     userType,
//     userId,
//     products,
//     discountRate,
//     discountAmount,
//     offerStartDate,
//     offerExpireDate,
//     offerText,
//     bannerImage
//   });

//   res.status(201).json({
//     success: true,
//     message: "Offer created successfully",
//     offer
//   });
// });


// // GET offers for logged-in customer
// exports.getOffersForCustomer = catchAsyncErrors(async (req, res) => {
//   const customerId = req.customer?._id;

//   if (!customerId) {
//     return res.status(401).json({
//       success: false,
//       message: "Unauthorized. Please log in as customer."
//     });
//   }

//   const offers = await Offer.find({
//     userType: "CustomerAuth",
//     userId: customerId // ✅ Filter offers assigned to this customer only
//   })
//     .populate({
//       path: "products",
//       select: "name price"
//     })
//     .sort({ createdAt: -1 });

//   res.status(200).json({
//     success: true,
//     count: offers.length,
//     offers
//   });
// });

// ✅ Create offer (Admin or User creates for a customer)
exports.createOffer = catchAsyncErrors(async (req, res) => {
  const {
    userType,
    userId,
    products,
    discountRate,
    discountAmount,
    offerStartDate,
    offerExpireDate,
    offerText
  } = req.body;

  if (
    !userType ||
    !userId ||
    !products ||
    products.length === 0 ||
    !offerStartDate ||
    !offerExpireDate ||
    !offerText
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  const bannerImage = req.file?.path || null;

  const offer = await Offer.create({
    userType,
    userId,
    products,
    discountRate,
    discountAmount,
    offerStartDate,
    offerExpireDate,
    offerText,
    bannerImage
  });

  // ✅ Create Notification
  await Notification.create({
    user: userId,
    userType: userType,
    title: "New Offer Created",
    message: `An offer has been created: "${offerText}" with ${discountRate ? discountRate + '% discount' : '₹' + discountAmount + ' off'}.`,
    type: "SYSTEM"
  });

  res.status(201).json({
    success: true,
    message: "Offer created successfully",
    offer
  });
});

// ✅ Get offers for logged-in customer
// controllers/offerController.js

exports.getOffersForCustomer = catchAsyncErrors(async (req, res) => {
  const customerId = req.customer?._id;

  if (!customerId) {
    // ✅ Return empty offers instead of throwing error
    return res.status(200).json({
      success: true,
      count: 0,
      offers: []
    });
  }

  const offers = await Offer.find({
    userType: "CustomerAuth",
    userId: customerId
  }).populate({
    path: "products",
    select: "name price"
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: offers.length,
    offers
  });
});

// ✅ GET /api/v1/offers
exports.getAllOffers = catchAsyncErrors(async (req, res) => {
  const offers = await Offer.find()
    .populate({
      path: "products",
      select: "name price" // adjust fields as needed
    })
    .populate({
      path: "userId",
      select: "name email" // optional: show who created the offer
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: offers.length,
    offers
  });
});

// GET /api/v1/offer/:id
exports.getOfferDetails = catchAsyncErrors(async (req, res, next) => {
  const offerId = req.params.id;

  const offer = await Offer.findById(offerId)
    .populate({
      path: "products",
      select: "name price"
    })
    .populate({
      path: "userId",
      select: "name email"
    });

  if (!offer) {
    return res.status(404).json({
      success: false,
      message: "Offer not found"
    });
  }

  res.status(200).json({
    success: true,
    offer
  });
});

// PUT /api/v1/offer/:id
exports.updateOffer = catchAsyncErrors(async (req, res, next) => {
  const offerId = req.params.id;

  let offer = await Offer.findById(offerId);

  if (!offer) {
    return res.status(404).json({
      success: false,
      message: "Offer not found"
    });
  }

  // If you have a file upload for bannerImage
  if (req.file) {
    req.body.bannerImage = req.file.path;
  }

  offer = await Offer.findByIdAndUpdate(offerId, req.body, {
    new: true,
    runValidators: true
  }).populate({
    path: "products",
    select: "name price"
  });

  res.status(200).json({
    success: true,
    message: "Offer updated successfully",
    offer
  });
});



// exports.getReferralDashboard = async (req, res) => {
//   try {
//     // 1️⃣ Total referrals (from ReferralTransaction)
//     const totalReferrals = await ReferralTransaction.countDocuments();

//     // 2️⃣ Active referrals — check if referred user has placed their first order
//     const referredUserIds = await ReferralTransaction.distinct("referredUser");
//     const activeShopRefs = await Shop.countDocuments({
//       _id: { $in: referredUserIds },
//       hasPlacedFirstOrder: true
//     });
//     const activeCustomerRefs = await Customer.countDocuments({
//       _id: { $in: referredUserIds },
//       hasPlacedFirstOrder: true
//     });
//     const activeReferrals = activeShopRefs + activeCustomerRefs;

//     // 3️⃣ Total Gullak coins earned via referrals
//     const totalEarnedAgg = await GullakHistory.aggregate([
//       { $match: { type: "EARNED" } },
//       { $group: { _id: null, total: { $sum: "$coins" } } }
//     ]);
//     const totalGullakCoinsEarned = totalEarnedAgg[0]?.total || 0;

//     // 4️⃣ Total Gullak coins claimed/redeemed
//     const redeemedFromHistory = await GullakHistory.aggregate([
//       { $match: { type: "REDEEMED" } },
//       { $group: { _id: null, total: { $sum: "$coins" } } }
//     ]);
//     const redeemedFromOrders = await Order.aggregate([
//       { $match: { gullakUsed: { $gt: 0 } } },
//       { $group: { _id: null, total: { $sum: "$gullakUsed" } } }
//     ]);
//     const totalGullakCoinsClaimed =
//       (redeemedFromHistory[0]?.total || 0) +
//       (redeemedFromOrders[0]?.total || 0);

//     res.status(200).json({
//       success: true,
//       dashboard: {
//         totalReferrals,
//         activeReferrals,
//         totalGullakCoinsEarned,
//         totalGullakCoinsClaimed
//       }
//     });

//   } catch (error) {
//     console.error("Referral Dashboard Error:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


exports.getReferralDashboard = async (req, res) => {
  try {
    // 1️⃣ Total referral transactions (from ReferralTransaction)
    const totalReferrals = await ReferralTransaction.countDocuments();

    // 2️⃣ Distinct referred users
    const referredUserIds = await ReferralTransaction.distinct("referredUser");

    const shopsReferred = await Shop.countDocuments({
      _id: { $in: referredUserIds }
    });
    const customersReferred = await Customer.countDocuments({
      _id: { $in: referredUserIds }
    });
    const activeReferrals = shopsReferred + customersReferred;

    // 3️⃣ Distinct referrers
    const referrerIds = await ReferralTransaction.distinct("referrer");
    const shopReferrers = await Shop.countDocuments({
      _id: { $in: referrerIds }
    });
    const customerReferrers = await Customer.countDocuments({
      _id: { $in: referrerIds }
    });

    // 4️⃣ Gullak coins earned
    const gullakEarned = await GullakHistory.aggregate([
      { $match: { type: "EARNED" } },
      { $group: { _id: null, total: { $sum: "$coins" } } }
    ]);
    const totalGullakCoinsEarned = gullakEarned[0]?.total || 0;

    // 5️⃣ Gullak coins claimed
    const gullakRedeemed = await GullakHistory.aggregate([
      { $match: { type: "REDEEMED" } },
      { $group: { _id: null, total: { $sum: "$coins" } } }
    ]);
    const gullakUsedInOrders = await Order.aggregate([
      { $match: { gullakUsed: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$gullakUsed" } } }
    ]);

    const totalGullakCoinsClaimed =
      (gullakRedeemed[0]?.total || 0) + (gullakUsedInOrders[0]?.total || 0);

    res.status(200).json({
      success: true,
      dashboard: {
        totalReferralTransactions: totalReferrals,
        activeReferredUsers: activeReferrals,
        referredShopsCount: shopsReferred,
        referredCustomersCount: customersReferred,
        referrerShopsCount: shopReferrers,
        referrerCustomersCount: customerReferrers,
        totalGullakCoinsEarned,
        totalGullakCoinsClaimed
      }
    });
  } catch (error) {
    console.error("Referral Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getSellerReferralDashboard = async (req, res) => {
  try {
    // Get all shops with role USER
    const sellers = await Shop.find({ role: "USER" });

    const results = [];

    for (const seller of sellers) {
      // Count how many people this seller referred
      const referralCount = await ReferralTransaction.countDocuments({
        referrer: seller._id
      });

      results.push({
        storeName: seller.shopName || seller.ownerName || "N/A",
        coins: seller.gullakPoints || 0,
        referralCount,
        status: seller.status || "unknown"
      });
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Seller Referral Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getCustomerReferralDashboard = async (req, res) => {
  try {
    // Get all customers with role CUSTOMER
    const customers = await Customer.find({ role: "CUSTOMER" });

    const results = [];

    for (const customer of customers) {
      // Count how many people this customer referred
      const referralCount = await ReferralTransaction.countDocuments({
        referrer: customer._id
      });

      results.push({
        name: customer.name || "N/A",
        coins: customer.gullakPoints || 0,
        referralCount,
        status: customer.status || "unknown"
      });
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Customer Referral Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getCoinEconomicsChart = async (req, res) => {
  try {
    const { range } = req.query || "week"; // week | month | year
    const now = moment();

    let startDate, endDate, labels = [], dateFormat;

    if (range === "week") {
      startDate = now.startOf("week").toDate();
      endDate = now.endOf("week").toDate();
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      dateFormat = "ddd";
    } else if (range === "month") {
      startDate = now.startOf("month").toDate();
      endDate = now.endOf("month").toDate();
      const weeksInMonth = now.endOf("month").week() - now.startOf("month").week() + 1;
      labels = Array.from({ length: weeksInMonth }, (_, i) => `Week ${i + 1}`);
      dateFormat = "W";
    } else if (range === "year") {
      startDate = now.startOf("year").toDate();
      endDate = now.endOf("year").toDate();
      labels = moment.monthsShort(); // ["Jan", "Feb", ...]
      dateFormat = "MMM";
    } else {
      return res.status(400).json({ success: false, message: "Invalid range" });
    }

    // Prepare maps for shops and customers
    const shopCoinsMap = new Map();
    const customerCoinsMap = new Map();
    labels.forEach(label => {
      shopCoinsMap.set(label, 0);
      customerCoinsMap.set(label, 0);
    });

    // Fetch SHOP coins from ReferralTransaction
    const shopReferrals = await ReferralTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    shopReferrals.forEach(ref => {
      let label;
      if (range === "month") {
        const weekNum = moment(ref.createdAt).week() - moment(startDate).week() + 1;
        label = `Week ${weekNum}`;
      } else {
        label = moment(ref.createdAt).format(dateFormat);
      }
      if (shopCoinsMap.has(label)) {
        shopCoinsMap.set(label, shopCoinsMap.get(label) + ref.amount);
      }
    });

    // Fetch CUSTOMER coins from GullakHistory
    const customerHistory = await GullakHistory.find({
      createdAt: { $gte: startDate, $lte: endDate },
      type: "EARNED"
    });

    customerHistory.forEach(h => {
      let label;
      if (range === "month") {
        const weekNum = moment(h.createdAt).week() - moment(startDate).week() + 1;
        label = `Week ${weekNum}`;
      } else {
        label = moment(h.createdAt).format(dateFormat);
      }
      if (customerCoinsMap.has(label)) {
        customerCoinsMap.set(label, customerCoinsMap.get(label) + h.coins);
      }
    });

    // Format response arrays
    const shopCoins = labels.map(l => shopCoinsMap.get(l) || 0);
    const customerCoins = labels.map(l => customerCoinsMap.get(l) || 0);

    return res.status(200).json({
      success: true,
      labels,
      shopCoins,
      customerCoins
    });

  } catch (error) {
    console.error("Coin Economics Chart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


//gullak

exports.getCoinBreakageDashboard = async (req, res) => {
  try {
    const now = new Date();
    const next30Days = new Date();
    next30Days.setDate(now.getDate() + 30);

    // 1️⃣ SHOP TOTAL EARNED + COUNT
    const shopAgg = await ReferralTransaction.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);
    const shopTotalEarned = shopAgg[0]?.total || 0;
    const shopEarnCount = shopAgg[0]?.count || 0;

    // 2️⃣ CUSTOMER TOTAL EARNED + COUNT
    const customerEarnAgg = await GullakHistory.aggregate([
      { $match: { type: "EARNED" } },
      { $group: { _id: null, total: { $sum: "$coins" }, count: { $sum: 1 } } }
    ]);
    const customerTotalEarned = customerEarnAgg[0]?.total || 0;
    const customerEarnCount = customerEarnAgg[0]?.count || 0;

    // ➡️ Total Earned = Shop + Customer
    const totalEarned = shopTotalEarned + customerTotalEarned;

    // 3️⃣ CUSTOMER TOTAL REDEEMED + COUNT
    const customerRedeemAgg = await GullakHistory.aggregate([
      { $match: { type: "REDEEMED" } },
      { $group: { _id: null, total: { $sum: "$coins" }, count: { $sum: 1 } } }
    ]);
    const totalRedeemed = customerRedeemAgg[0]?.total || 0;
    const customerRedeemCount = customerRedeemAgg[0]?.count || 0;

    // ➡️ Active = Earned - Redeemed
    const totalActiveCoins = totalEarned - totalRedeemed;

    // 4️⃣ TOTAL EXPIRED + COUNT
    const expiredAgg = await GullakHistory.aggregate([
      {
        $match: {
          type: "EARNED",
          validTill: { $lte: now }
        }
      },
      { $group: { _id: null, total: { $sum: "$coins" }, count: { $sum: 1 } } }
    ]);
    const totalExpired = expiredAgg[0]?.total || 0;
    const expiredCount = expiredAgg[0]?.count || 0;

    // 5️⃣ COINS EXPIRING SOON (next 30 days) + COUNT
    const expiringSoonAgg = await GullakHistory.aggregate([
      {
        $match: {
          type: "EARNED",
          validTill: { $gt: now, $lte: next30Days }
        }
      },
      { $group: { _id: null, total: { $sum: "$coins" }, count: { $sum: 1 } } }
    ]);
    const expiringSoon = expiringSoonAgg[0]?.total || 0;
    const expiringSoonCount = expiringSoonAgg[0]?.count || 0;

    // 6️⃣ BREAKAGE RATE %
    const breakageRate = totalEarned > 0
      ? `${((totalExpired / totalEarned) * 100).toFixed(2)}%`
      : "0%";

    return res.status(200).json({
      success: true,

      // 📊 AMOUNTS
      totalEarned,
      totalRedeemed,
      totalActiveCoins,
      totalExpired,
      expiringSoon,

      // ✅ PERCENTAGE
      breakageRate,

      // 📊 COUNTS
      shopEarnCount,
      customerEarnCount,
      customerRedeemCount,
      expiredCount,
      expiringSoonCount
    });

  } catch (error) {
    console.error("Coin Breakage Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.getCoinEconomicsBarChart = async (req, res) => {
  try {
    const { period } = req.query; // week | month | year

    if (!["week", "month", "year"].includes(period)) {
      return res.status(400).json({ success: false, message: "Invalid period" });
    }

    const now = new Date();
    let startDate, groupFormat, labelFormat;

    if (period === "week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      groupFormat = { $dayOfWeek: "$createdAt" }; // 1=Sun,...7=Sat
      labelFormat = (d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d - 1];
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupFormat = {
        $ceil: { $divide: [{ $dayOfMonth: "$createdAt" }, 7] }
      }; // week in month
      labelFormat = (w) => `Week ${w}`;
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      groupFormat = { $month: "$createdAt" };
      labelFormat = (m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
    }

    // ✅ EARNED (GullakHistory)
    const earnedAgg = await GullakHistory.aggregate([
      { $match: { type: "EARNED", createdAt: { $gte: startDate } } },
      { $group: { _id: groupFormat, total: { $sum: "$coins" } } }
    ]);

    // ✅ REDEEMED (Order gullakDiscount)
    const redeemedAgg = await Order.aggregate([
      { $match: { gullakDiscount: { $gt: 0 }, createdAt: { $gte: startDate } } },
      { $group: { _id: groupFormat, total: { $sum: "$gullakDiscount" } } }
    ]);

    // ✅ EXPIRED (coins that expired within the period)
    const expiredAgg = await GullakHistory.aggregate([
      {
        $match: {
          type: "EARNED",
          validTill: { $lte: new Date() },
          createdAt: { $gte: startDate }
        }
      },
      { $group: { _id: groupFormat, total: { $sum: "$coins" } } }
    ]);

    // ✅ Merge results
    const map = {};
    earnedAgg.forEach((row) => {
      const label = labelFormat(row._id);
      map[label] = map[label] || { earned: 0, redeemed: 0, expired: 0 };
      map[label].earned = row.total;
    });
    redeemedAgg.forEach((row) => {
      const label = labelFormat(row._id);
      map[label] = map[label] || { earned: 0, redeemed: 0, expired: 0 };
      map[label].redeemed = row.total;
    });
    expiredAgg.forEach((row) => {
      const label = labelFormat(row._id);
      map[label] = map[label] || { earned: 0, redeemed: 0, expired: 0 };
      map[label].expired = row.total;
    });

    // ✅ Fill missing labels
    let labels;
    if (period === "week") labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (period === "month") labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
    if (period === "year") labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const data = labels.map(label => ({
      label,
      earned: map[label]?.earned || 0,
      redeemed: map[label]?.redeemed || 0,
      expired: map[label]?.expired || 0,
    }));

    res.status(200).json({
      success: true,
      period,
      data
    });

  } catch (error) {
    console.error("Coin Economics Bar Chart Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getLastGullakManagement = async (req, res) => {
  try {
    const now = new Date();

    // 🔹 1️⃣ Latest Customer GullakHistory
    const customerTxs = await GullakHistory.find({})
      .populate({
        path: "userId",
        model: "CustomerAuth",
        select: "referralCode"
      })
      .sort({ createdAt: -1 })
      .limit(5);

    const customerResults = customerTxs.map((tx) => ({
      referCode: tx.userId?.referralCode || "N/A",
      type: tx.type,
      amount: tx.coins,
      issueDate: tx.createdAt,
      expireDate: tx.validTill || null,
      status:
        tx.type === "EARNED"
          ? tx.validTill && tx.validTill < now
            ? "Expired"
            : "Active"
          : "Redeemed",
      userType: "CUSTOMER"
    }));

    // 🔹 2️⃣ Latest Shop Referral Transactions
    const shopTxs = await ReferralTransaction.find({})
      .populate({
        path: "referrer",
        model: "UsersAuth",
        select: "referralCode"
      })
      .sort({ createdAt: -1 })
      .limit(5);

    const shopResults = shopTxs.map((tx) => ({
      referCode: tx.referrer?.referralCode || "N/A",
      type: "EARNED",
      amount: tx.amount,
      issueDate: tx.createdAt,
      expireDate: null,
      status: "Active",
      userType: "SHOP"
    }));

    // ✅ Combine both results
    const combinedResults = [...customerResults, ...shopResults].sort(
      (a, b) => b.issueDate - a.issueDate
    );

    res.status(200).json({
      success: true,
      count: combinedResults.length,
      data: combinedResults
    });
  } catch (error) {
    console.error("getLastGullakManagement Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


//admin dashboard

exports.getAdminDashboard = async (req, res) => {
  try {
    // 1️⃣ Total shops
    const totalShops = await Shop.countDocuments({ role: "USER" });

    // 2️⃣ Total customers
    const totalCustomers = await Customer.countDocuments({ role: "CUSTOMER" });

    // 3️⃣ Total orders
    const totalOrders = await Order.countDocuments();

    // 4️⃣ Total revenue
    const totalRevenueAgg = await Order.aggregate([
      { $match: { razorpayLinkStatus: "created" } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // 5️⃣ Total reviews (assuming you store them in Shop)
    const totalReviewsAgg = await Shop.aggregate([
      { $unwind: "$ratings" },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    const totalReviews = totalReviewsAgg[0]?.count || 0;

    // 6️⃣ Active stores (active + approved)
    const activeStores = await Shop.countDocuments({
      status: { $in: ["active", "approved"] }
    });

    // 7️⃣ Today’s orders
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    return res.status(200).json({
      success: true,
      totalShops,
      totalCustomers,
      totalOrders,
      totalRevenue,
      totalReviews,
      activeStores,
      todayOrders
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.getSalesSummary = async (req, res) => {
  try {
    const { period } = req.query; // week | month | year

    let match = { razorpayLinkStatus: "created" };
    let groupStage = {};
    let labels = [];
    let now = moment().endOf("day");
    let startDate;

    if (period === "week") {
      // 🗓️ This week: Sunday to Saturday
      startDate = moment().startOf("week"); // Sunday
      const endDate = moment().endOf("week"); // Saturday
      match.createdAt = { $gte: startDate.toDate(), $lte: endDate.toDate() };

      groupStage = {
        _id: { $dayOfWeek: "$createdAt" }, // Sunday=1 ... Saturday=7
        totalSales: { $sum: "$finalAmount" },
        ordersCount: { $sum: 1 }
      };

      labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    } else if (period === "month") {
      // 🗓️ This month: Weeks (ISO)
      startDate = moment().startOf("month");
      const endDate = moment().endOf("month");
      match.createdAt = { $gte: startDate.toDate(), $lte: endDate.toDate() };

      groupStage = {
        _id: { $isoWeek: "$createdAt" },
        totalSales: { $sum: "$finalAmount" },
        ordersCount: { $sum: 1 }
      };

      // figure out all weeks in this month
      const startWeek = startDate.isoWeek();
      const endWeek = endDate.isoWeek();
      for (let w = startWeek; w <= endWeek; w++) {
        labels.push(`Week ${w}`);
      }

    } else if (period === "year") {
      // 🗓️ This year: Months
      startDate = moment().startOf("year");
      const endDate = moment().endOf("year");
      match.createdAt = { $gte: startDate.toDate(), $lte: endDate.toDate() };

      groupStage = {
        _id: { $month: "$createdAt" },
        totalSales: { $sum: "$finalAmount" },
        ordersCount: { $sum: 1 }
      };

      labels = moment.months(); // Jan..Dec

    } else {
      return res.status(400).json({ success: false, message: "Invalid period" });
    }

    const rawData = await Order.aggregate([
      { $match: match },
      { $group: groupStage }
    ]);

    // 📊 Make a map
    const dataMap = new Map();
    rawData.forEach(item => {
      dataMap.set(item._id, {
        totalSales: item.totalSales,
        ordersCount: item.ordersCount
      });
    });

    // ✅ Fill missing slots with 0
    const results = [];

    if (period === "week") {
      for (let i = 1; i <= 7; i++) {
        results.push({
          day: labels[i - 1],
          totalSales: dataMap.get(i)?.totalSales || 0,
          ordersCount: dataMap.get(i)?.ordersCount || 0
        });
      }
    }

    if (period === "month") {
      const startWeek = startDate.isoWeek();
      const endWeek = moment().endOf("month").isoWeek();

      for (let w = startWeek; w <= endWeek; w++) {
        results.push({
          week: `Week ${w}`,
          totalSales: dataMap.get(w)?.totalSales || 0,
          ordersCount: dataMap.get(w)?.ordersCount || 0
        });
      }
    }

    if (period === "year") {
      for (let m = 1; m <= 12; m++) {
        results.push({
          month: labels[m - 1],
          totalSales: dataMap.get(m)?.totalSales || 0,
          ordersCount: dataMap.get(m)?.ordersCount || 0
        });
      }
    }

    res.status(200).json({
      success: true,
      period,
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: now.format("YYYY-MM-DD"),
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Sales Summary API Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getLastOrders = async (req, res) => {
  try {
    // 🔍 Get last 10 orders (newest first)
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "userId",
        select: "name location address"
      });

    const results = orders.map(order => {
      const customer = order.userId;

      return {
        orderNumber: order.orderNumber || "N/A",
        customerName: customer?.name || "N/A",
        location: customer?.location?.formattedAddress || customer?.address || "N/A"
      };
    });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Get Last Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getLastSellers = async (req, res) => {
  try {
    // ✅ Find last 5 sellers (role: USER)
    const sellers = await Shop.find({ role: "USER" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("shopName ownerName email createdAt");

    const results = sellers.map(seller => ({
      storeName: seller.shopName || "N/A",
      ownerName: seller.ownerName || "N/A",
      email: seller.email || "N/A",
      createdAt: seller.createdAt
    }));

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Get Last Sellers Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getLastCustomers = async (req, res) => {
  try {
    // ✅ Find last 5 customers (role: CUSTOMER)
    const customers = await Customer.find({ role: "CUSTOMER" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name phoneNumber email createdAt");

    const results = customers.map(customer => ({
      name: customer.name || "N/A",
      phoneNumber: customer.phoneNumber || "N/A",
      email: customer.email || "N/A",
      createdAt: customer.createdAt
    }));

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Get Last Customers Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getMostActiveCustomers = async (req, res) => {
  try {
    // ✅ Aggregate orders: group by customer, count orders
    const activeUsers = await Order.aggregate([
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { orderCount: -1 } // sort by most orders
      },
      {
        $limit: 5 // get top 5 most active
      }
    ]);

    // ✅ Fetch customer details for those IDs
    const userIds = activeUsers.map(u => u._id);

    const customers = await Customer.find({ _id: { $in: userIds } })
      .select("name email phoneNumber createdAt");

    // ✅ Merge counts with customer info
    const results = activeUsers.map(user => {
      const customer = customers.find(c => c._id.toString() === user._id.toString());
      return {
        name: customer?.name || "N/A",
        email: customer?.email || "N/A",
        phoneNumber: customer?.phoneNumber || "N/A",
        createdAt: customer?.createdAt,
        orderCount: user.orderCount
      };
    });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Get Most Active Customers Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getMostInactiveCustomers = async (req, res) => {
  try {
    // ✅ Get all customers
    const allCustomers = await Customer.find({ role: "CUSTOMER" }).select(
      "_id name email phoneNumber createdAt"
    );

    // ✅ Get order counts for each customer
    const orderCounts = await Order.aggregate([
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // ✅ Merge counts
    const results = allCustomers.map(customer => {
      const orderData = orderCounts.find(
        o => o._id.toString() === customer._id.toString()
      );
      return {
        name: customer.name || "N/A",
        email: customer.email || "N/A",
        phoneNumber: customer.phoneNumber || "N/A",
        createdAt: customer.createdAt,
        orderCount: orderData?.orderCount || 0
      };
    });

    // ✅ Sort by least orders
    results.sort((a, b) => a.orderCount - b.orderCount);

    // ✅ Limit to top 5 inactive
    const inactiveUsers = results.slice(0, 5);

    res.status(200).json({
      success: true,
      count: inactiveUsers.length,
      data: inactiveUsers
    });

  } catch (error) {
    console.error("Get Most Inactive Customers Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getMostOrderedItems = async (req, res) => {
  try {
    // 🟢 Aggregate total quantity per productId
    const aggregation = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" }
        }
      },
      {
        $sort: { totalQuantity: -1 } // Descending
      },
      { $limit: 5 } // Top 5 most ordered items
    ]);

    // 🟢 Populate product details for each productId
    const results = await Promise.all(
      aggregation.map(async (item) => {
        const product = await Product.findById(item._id).select(
          "productName brand"
        );
        return {
          productName: product?.productName || "N/A",
          brandName: product?.brand || "N/A",
          totalQuantity: item.totalQuantity
        };
      })
    );

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Get Most Ordered Items Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getPackedAndDeliveredOrderCount = async (req, res) => {
  try {
    const packedCount = await Order.countDocuments({ status: "PACKED" });
    const deliveredCount = await Order.countDocuments({ status: "DELIVERED" });

    return res.status(200).json({
      success: true,
      packedCount,
      deliveredCount
    });

  } catch (error) {
    console.error("Get Packed & Delivered Order Count Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getReferralProgramState = async (req, res) => {
  try {
    // 1️⃣ TOTAL REFERRALS — count all referral transactions
    const totalReferrals = await ReferralTransaction.countDocuments();

    // 2️⃣ ACTIVE REFERRALS — referred user exists in Shop or Customer
    const referredUserIds = await ReferralTransaction.distinct("referredUser");

    const activeShopCount = await Shop.countDocuments({
      _id: { $in: referredUserIds }
    });

    const activeCustomerCount = await Customer.countDocuments({
      _id: { $in: referredUserIds }
    });

    const activeReferrals = activeShopCount + activeCustomerCount;

    // 3️⃣ TOTAL GULLAK COINS EARNED
    const totalGullakEarnedAgg = await GullakHistory.aggregate([
      { $match: { type: "EARNED" } },
      { $group: { _id: null, total: { $sum: "$coins" } } }
    ]);
    const totalGullakCoinsEarned = totalGullakEarnedAgg[0]?.total || 0;

    // 4️⃣ TOTAL GULLAK COINS CLAIMED/REDEEMED
    const redeemedFromGullak = await GullakHistory.aggregate([
      { $match: { type: "REDEEMED" } },
      { $group: { _id: null, total: { $sum: "$coins" } } }
    ]);
    const redeemedFromOrders = await Order.aggregate([
      { $match: { gullakUsed: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$gullakUsed" } } }
    ]);

    const totalGullakCoinsClaimed =
      (redeemedFromGullak[0]?.total || 0) + (redeemedFromOrders[0]?.total || 0);

    return res.status(200).json({
      success: true,
      referralProgramState: {
        totalReferrals,
        activeReferrals,
        totalGullakCoinsEarned,
        totalGullakCoinsClaimed
      }
    });

  } catch (error) {
    console.error("Referral Program State Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.getSellerCustomerCounts = async (req, res) => {
  try {
    // Count sellers (shops)
    const totalSellers = await Shop.countDocuments({ role: "USER" });

    // Count customers
    const totalCustomers = await Customer.countDocuments({ role: "CUSTOMER" });

    // Combine both
    const totalSellerCustomers = totalSellers + totalCustomers;

    return res.status(200).json({
      success: true,
      counts: {
        totalSellers,
        totalCustomers,
        totalSellerCustomers
      }
    });

  } catch (error) {
    console.error("Get Seller & Customer Counts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



// ✅ Distance helper

// ✅ Helper: Calculate distance between two lat/lng points in KM
// ✅ Helper: Haversine distance in KM


// ✅ Helper: Calculate distance in KM (Haversine formula)

// ✅ Helper: Haversine distance in KM
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  const R = 6371; // Radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ✅ Helper: Open/Closed status
function isShopOpen(openingTime, closingTime) {
  if (!openingTime || !closingTime) return false;

  const format = "hh:mm A";
  const now = moment();
  const open = moment(openingTime, format);
  const close = moment(closingTime, format);

  if (close.isBefore(open)) {
    return now.isAfter(open) || now.isBefore(close);
  } else {
    return now.isBetween(open, close);
  }
}

// ✅ Get all shops with filters
// exports.getAllShopswithfilters = async (req, res) => {
//   try {
//     const userId = req.customer.id;
//     const {
//       approvedOnly,
//       minRating,
//       sortBy,
//       pickOnly,
//       ratings,
//       pickupAndDelivery
//     } = req.query;

//     let customerLat = null;
//     let customerLng = null;
//     let useDistance = false;

//     // ✅ Step 1: Get customer location for distance sorting
//     if (sortBy === "distance") {
//       const customer = await Customer.findById(userId);
//       if (
//         !customer ||
//         !customer.location?.coordinates?.lat ||
//         !customer.location?.coordinates?.lng
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "Customer location required for sorting by distance."
//         });
//       }
//       customerLat = customer.location.coordinates.lat;
//       customerLng = customer.location.coordinates.lng;
//       useDistance = true;
//     }

//     // ✅ Step 2: Build MongoDB query
//     const query = { role: "USER" };

//     if (approvedOnly === "true") {
//       query.status = "approved";
//     }

//     if (pickOnly === "true") {
//       query.pickup = true;
//     }else{
//       if (pickOnly === "false") {
//       query.pickup = false;
//     }
//     }


//     if (pickupAndDelivery === "true") {
//       query.pickup = false; // only delivery shops (pickup disabled)
//     }

//     // ✅ Step 3: Fetch shops
//     const shops = await Shop.find(query);

//     // ✅ Step 4: Format and filter results
//     let results = shops
//       .map((shop) => {
//         let distance = null;

//         if (
//           useDistance &&
//           shop.location?.coordinates?.lat != null &&
//           shop.location?.coordinates?.lng != null &&
//           customerLat != null &&
//           customerLng != null
//         ) {
//           distance = getDistanceFromLatLonInKm(
//             customerLat,
//             customerLng,
//             shop.location.coordinates.lat,
//             shop.location.coordinates.lng
//           );
//         }

//         const isOpen = isShopOpen(
//           shop.shopTime?.openingTime,
//           shop.shopTime?.closingTime
//         );

//         return {
//           shopName: shop.shopName,
//           image: shop.image,
//           averageRating: shop.averageRating || 0,
//           totalReviews: shop.totalReviews || 0,
//           shopTime: shop.shopTime || {},
//           status: isOpen ? "open" : "closed",
//           distance: distance != null ? `${distance.toFixed(2)} km` : null,
//           rawDistance: distance != null ? distance : null
//         };
//       })
//       .filter((shop) => {
//         if (minRating && shop.averageRating < Number(minRating)) {
//           return false;
//         }
//         return true;
//       });

//     // ✅ Step 5: Sort shops
//     if (ratings !== undefined) {
//       results.sort((a, b) => b.averageRating - a.averageRating);
//     } else if (useDistance) {
//       results.sort((a, b) => a.rawDistance - b.rawDistance);
//     } else {
//       results.sort((a, b) => b.averageRating - a.averageRating);
//     }

//     // ✅ Step 6: Respond
//     return res.status(200).json({
//       success: true,
//       count: results.length,
//       shops: results
//     });

//   } catch (error) {
//     console.error("Get All Shops Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

exports.getAllShopswithfilters = async (req, res) => {
  try {
    const userId = req.customer.id;
    const {
      approvedOnly,
      minRating,
      sortBy,
      pickOnly,
      ratings,
      pickupAndDelivery
    } = req.query;

    let customerLat = null;
    let customerLng = null;

    // ✅ Step 1: Get customer location (always required now for distance)
    const customer = await Customer.findById(userId);
    if (
      !customer ||
      !customer.location?.coordinates?.lat ||
      !customer.location?.coordinates?.lng
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer location required to get shop distances."
      });
    }
    customerLat = customer.location.coordinates.lat;
    customerLng = customer.location.coordinates.lng;

    // ✅ Step 2: Build MongoDB query
    const query = { role: "USER" };

    if (approvedOnly === "true") {
      query.status = "approved";
    }

    if (pickOnly === "true") {
      query.pickup = true;
    } else if (pickOnly === "false") {
      query.pickup = false;
    }

    if (pickupAndDelivery === "true") {
      query.pickup = false;
    }

    // ✅ Step 3: Fetch shops
    const shops = await Shop.find(query);

    // ✅ Step 4: Format and filter results
    let results = shops
      .map((shop) => {
        let distance = null;

        if (
          shop.location?.coordinates?.lat != null &&
          shop.location?.coordinates?.lng != null
        ) {
          distance = getDistanceFromLatLonInKm(
            customerLat,
            customerLng,
            shop.location.coordinates.lat,
            shop.location.coordinates.lng
          );
        }

        const isOpen = isShopOpen(
          shop.shopTime?.openingTime,
          shop.shopTime?.closingTime
        );

        return {
          shopName: shop.shopName,
          image: shop.image,
          averageRating: shop.averageRating || 0,
          totalReviews: shop.totalReviews || 0,
          shopTime: shop.shopTime || {},
          status: isOpen ? "open" : "closed",
          distance: `${distance?.toFixed(2) || "0.00"} km`,
          rawDistance: distance ?? 0
        };
      })
      .filter((shop) => {
        if (minRating && shop.averageRating < Number(minRating)) {
          return false;
        }
        return true;
      });

    // ✅ Step 5: Sort shops
    if (ratings !== undefined) {
      results.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sortBy === "distance") {
      results.sort((a, b) => a.rawDistance - b.rawDistance);
    } else {
      results.sort((a, b) => b.averageRating - a.averageRating);
    }

    // ✅ Step 6: Respond
    return res.status(200).json({
      success: true,
      count: results.length,
      shops: results
    });

  } catch (error) {
    console.error("Get All Shops Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
