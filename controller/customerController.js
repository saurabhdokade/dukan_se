const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/customerModel");
const sendToken = require("../utils/jwtToken");
const bcrypt = require("bcryptjs");
const {sendOTP} = require("../utils/twilio");
const KYC = require("../model/kycModel");
const BankDetails = require("../model/bankDetailsModel");
const sendEmail = require("../utils/sendEmail");
 
// exports.registerCustomer = catchAsyncErrors(async (req, res, next) => {
//     const { name, email, phoneNumber, dateOfBirth, address, location,password } = req.body;
 
//     if (!phoneNumber || !password) {
//         return next(new ErrorHander("Phone number and password are required", 400));
//     }
 
//     const existing = await User.findOne({ phoneNumber });
//     if (existing) {
//         return next(new ErrorHander("Account already exists", 400));
//     }
 
//     const account = await User.create({
//         name,
//         email,
//         phoneNumber,
//         password,
//         location,
//         address,
//         dateOfBirth,
//         role: "CUSTOMER",
//     });
 
//     sendToken(account, 201, res);
// });
 
// exports.registerCustomer = async (req, res, next) => {
//   try {
//     const {
//       phoneNumber,
//       referralCode // 🟡 Optional
//     } = req.body;
 
//     if (!phoneNumber) {
//       return next(new ErrorHander("Phone number and password are required", 400));
//     }
 
//     // Check existing phone
//     const existing = await User.findOne({ phoneNumber });
//     if (existing) {
//       return next(new ErrorHander("Account already exists", 400));
//     }
 
//     // Find referrer
//     let referredByUser = null;
//     if (referralCode) {
//       referredByUser = await User.findOne({ referralCode });
//       if (!referredByUser) {
//         return next(new ErrorHander("Invalid referral code", 400));
//       }
//     }
 
//     const account = await User.create({
//       phoneNumber,
//       role: "CUSTOMER",
//       referredBy: referredByUser ? referredByUser._id : null
//     });
 
//     sendToken(account, 201, res); // create token & send
//   } catch (error) {
//     console.error("Registration Error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };
 
 
const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
 
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}
 
exports.registerCustomer = async (req, res, next) => {
  try {
    const { phoneNumber, referralCode } = req.body;
 
    if (!phoneNumber) {
      return next(new ErrorHander("Phone number is required", 400));
    }
 
    const otp = generateOTP();
    const otpExpire = Date.now() + 5 * 60 * 1000;
 
    let user = await User.findOne({ phoneNumber });
 
    if (user) {
      user.otp = otp;
      user.otpExpire = otpExpire;
      await user.save();
 
      // Simulate sending OTP (ignore Twilio error)
      try {
        await client.messages.create({
          body: `Your login OTP is ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: `+91${phoneNumber}`
        });
      } catch (twilioErr) {
        console.warn("Twilio SMS error (ignored):", twilioErr.message);
      }
 
      return res.status(200).json({
        success: true,
        message: "OTP sent for login (or simulated)",
        data: { userId: user._id, otp } // send OTP only in development
      });
    }
 
    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode });
      if (!referredByUser) {
        return next(new ErrorHander("Invalid referral code", 400));
      }
    }
 
    const newUser = await User.create({
      phoneNumber,
      role: "CUSTOMER",
      referredBy: referredByUser ? referredByUser._id : null,
      otp,
      otpExpire
    });
 
    try {
      await client.messages.create({
        body: `Your signup OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER || "+13612667244",
        to: `+91${phoneNumber}`
      });
    } catch (twilioErr) {
      console.warn("Twilio SMS error (ignored):", twilioErr.message);
    }
 
    res.status(201).json({
      success: true,
      message: "OTP sent for signup (or simulated)",
      data: { userId: newUser._id, otp } // include OTP for testing only
    });
 
  } catch (error) {
    console.error("OTP Flow Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
 
 
exports.verifyCustomerOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
 
    if (!otp) {
      return next(new ErrorHander("OTP is required", 400));
    }
 
    // 🔍 Find user by OTP and make sure OTP is not expired
    const user = await User.findOne({
      otp,
      otpExpire: { $gt: Date.now() }
    });
 
    if (!user) {
      return next(new ErrorHander("Invalid or expired OTP", 400));
    }
 
    // ✅ Clear OTP after success
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();
 
    // ✅ Send login token
    sendToken(user, 200, res);
 
  } catch (error) {
    console.error("OTP Verify Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
 
 
// exports.addCustomerAddress = async (req, res, next) => {
//   try {
//     const customerId = req.customer._id; // Make sure user is authenticated and attached to req.user
//     const newAddress = req.body.address;
 
//     if (!newAddress) {
//       return res.status(400).json({ success: false, message: "Address is required" });
//     }
 
//     const customer = await User.findById(customerId);
//     if (!customer) {
//       return res.status(404).json({ success: false, message: "Customer not found" });
//     }
 
//     customer.addresses.push(newAddress);
//     await customer.save();
 
//     return res.status(200).json({
//       success: true,
//       message: "Address added successfully",
//       addresses: customer.addresses,
//     });
//   } catch (err) {
//     console.error("Add Address Error:", err);
//     return res.status(500).json({ success: false, message: "Server Error" });
//   }
// };
 
exports.addCustomerAddress = async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    const {
      houseNumber,
      roadName,
      landMark,
      city,
      state,
      pinCode,
      useCurrentLocation = false,
      coordinates,
      formattedAddress
    } = req.body;

    if (!houseNumber || !roadName || !city || !state || !pinCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required address fields"
      });
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const newAddress = {
      useCurrentLocation,
      coordinates,
      formattedAddress,
      address: {
        houseNumber,
        roadName,
        landMark,
        city,
        state,
        pinCode
      }
    };

    customer.addresses.push(newAddress); // addressSchema is embedded in locationSchema
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Address added successfully",
      addresses: customer.addresses
    });
  } catch (err) {
    console.error("Add Address Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.removeAddress = async (req, res) => {
  try {
    const customerId = req.customer.id; // Or use req.params.id if admin
    const { addressId } = req.params;
 
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
 
    // Remove address from the array
    customer.addresses = customer.addresses.filter(
      (addr) => addr._id.toString() !== addressId
    );
 
    await customer.save();
 
    res.status(200).json({
      success: true,
      message: "Address removed successfully",
      addresses: customer.addresses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};
 
exports.getAllAddresses = async (req, res) => {
  try {
    const customerId = req.customer.id; // Extracted from JWT token
 
    const customer = await User.findById(customerId).select("addresses");
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
 
    res.status(200).json({
      success: true,
      addresses: customer.addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
 
 
 
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
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
 
 
// exports.updateUserProfile = catchAsyncErrors(async (req, res, next) => {
//     const {
//         name,
//         email,
//         phoneNumber,
//         dateOfBirth,
//         location
//     } = req.body;
 
//     const user = await User.findById(req.params.id);
//     if (!user) {
//         return next(new ErrorHander("User not found", 404));
//     }
//     if (name) user.name = name;
//     if (dateOfBirth) user.dateOfBirth = dateOfBirth;
//     if (location) user.location = location;
//     if (phoneNumber) user.phoneNumber = phoneNumber;
//     if (email) user.email = email;
//     if (req.file) {
//         user.userProfile = req.file.path; // S3 puts the file URL in .location
//     }
//     // Save the updated user
//     await user.save();
 
//     res.status(200).json({
//         success: true,
//         message: "User details updated successfully!",
//         user,
//     });
// });
 
exports.updateUserProfile = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    email,
    phoneNumber,
    dateOfBirth,
    location,
    newAddress // 👈 Expected to be passed as full object
  } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }

  // Basic info
  if (name) user.name = name;
  if (dateOfBirth) user.dateOfBirth = dateOfBirth;
  if (location) user.location = location;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (email) user.email = email;

  // Profile picture
  if (req.file) {
    user.userProfile = req.file.path;
  }

  // ✅ Save new address if provided
  if (newAddress) {
    const {
      houseNumber,
      roadName,
      landMark,
      city,
      state,
      pinCode,
      useCurrentLocation = false,
      coordinates,
      formattedAddress
    } = newAddress;

    // Validate fields
    if (!houseNumber || !roadName || !city || !state || !pinCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required address fields"
      });
    }

    const formattedNewAddress = {
      useCurrentLocation,
      coordinates,
      formattedAddress,
      address: {
        houseNumber,
        roadName,
        landMark,
        city,
        state,
        pinCode
      }
    };

    user.addresses.push(formattedNewAddress); // 👈 This will save multiple addresses
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "User profile updated successfully",
    user
  });
});


exports.getCustomerProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-otp -otpExpire"); // Exclude OTP fields

    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.status(200).json({
      success: true,
      message: "Customer profile fetched successfully",
      data: user
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
