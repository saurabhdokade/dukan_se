const express = require("express");
const router = express.Router();
const {addFAQ,getAllFaqs} = require("../controller/faqController");

// Add FAQ (authentication optional)
const { isAuthenticatedUser } = require("../middlewares/auth");

router.post("/add",  isAuthenticatedUser, addFAQ);
router.get("/faqs",  isAuthenticatedUser, getAllFaqs);     // Get all FAQs

module.exports = router;
