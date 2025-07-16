const mongoose = require("mongoose");



// Terms and Conditions Schema
const TermsAndConditionsSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
  },
  { timestamps: true }
);

// Privacy Policy Schema
const PrivacyPolicySchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
  },
  { timestamps: true }
);

// About Us Schema
const AboutUsSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

const TermsAndConditionsModel =
  mongoose.models.TermsAndConditions || mongoose.model("TermsAndConditions", TermsAndConditionsSchema);
const PrivacyPolicyModel =
  mongoose.models.PrivacyPolicy || mongoose.model("PrivacyPolicy", PrivacyPolicySchema);
const AboutUsModel =
  mongoose.models.AboutUs || mongoose.model("AboutUs", AboutUsSchema);

module.exports = {
  TermsAndConditionsModel,
  PrivacyPolicyModel,
  AboutUsModel,
};