const FAQ = require("../model/faqModel");

// Add a new FAQ
exports.addFAQ = async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required"
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      createdBy: req.user?.id || null // Optional
    });

    res.status(201).json({
      success: true,
      message: "FAQ added successfully",
      faq
    });
  } catch (error) {
    console.error("Add FAQ error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding FAQ"
    });
  }
};

// Get all FAQs
exports.getAllFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt:  1});

    res.status(200).json({
      success: true,
      message: "FAQs fetched successfully",
      faqs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ✅ Get a single FAQ by ID
exports.getFaqById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ fetched successfully",
      faq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// ✅ Update a FAQ by ID
exports.updateFaqById = async (req, res) => {
  try {
    const { question, answer } = req.body;

    let faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    faq.question = question || faq.question;
    faq.answer = answer || faq.answer;

    await faq.save();

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      faq,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
