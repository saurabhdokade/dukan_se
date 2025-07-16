const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


/**
 * Sends OTP using Twilio.
 * Fails silently if SMS cannot be sent (for dev/testing).
 */
exports.sendOTP = async (mobileNumber, otp) => {
  try {
    await client.messages.create({
      body: `Your OTP for login is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${mobileNumber}`
    });
    console.log(`✅ OTP sent to ${mobileNumber}, OTP: ${otp}`);
  } catch (error) {
    console.warn(`⚠️ Twilio SMS failed: ${error.message}`);
  }
};

exports.verifyOTP = (phoneNumber, code) => {
  return client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID || "")
    .verificationChecks.create({
      to: `+91${phoneNumber}`,
      code: code,
    });
};
