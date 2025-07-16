const HelpSupport = require("../model/helpsupportModel");
const FAQ = require("../model/faqModel");
const catchAsyncError = require("../middlewares/catchAsyncErrors");
const SupportMessage = require("../model/supportMessageModel");
const Notification = require("../model/notificationModel");
// Helper to generate random ticket ID
const generateTicketId = () => {
  return "TICKET-" + Math.floor(100000 + Math.random() * 900000);
};

// ✅ POST /api/help-support/create
// exports.createSupportTicket = catchAsyncError(async (req, res) => {
//   const { faqId, message } = req.body;
//   const userId = req.customer.id;

//   const faq = await FAQ.findById(faqId);
//   if (!faq) {
//     return res.status(404).json({ success: false, message: "FAQ subject not found" });
//   }

//   const ticket = await HelpSupport.create({
//     userId,
//     faqId,
//     ticketId: generateTicketId(),
//     message
//   });

//   res.status(201).json({
//     success: true,
//     message: "Support ticket created",
//     ticket
//   });
// });

// POST /api/help-support/create
exports.createSupportTicket = catchAsyncError(async (req, res) => {
  const { faqId, message } = req.body;
  const userId = req.customer.id;

  const ticketId = generateTicketId();

  const ticket = await HelpSupport.create({
    userId,
    faqId,
    ticketId
  });

  await SupportMessage.create({
    ticketId,
    senderType: "CUSTOMER",
    message
  });

    // ✅ Create a complaint notification
  await Notification.create({
    user: userId,
    userType: "CustomerAuth",
    title: "Support Ticket Created",
    message: `Your support ticket ${ticketId} has been created. Our team will get back to you soon.`,
    type: "COMPLAINT"
  });

  res.status(201).json({
    success: true,
    message: "Ticket created",
    ticket,
    message,
    ticketId
  });
});

exports.createsellerSupportTicket = catchAsyncError(async (req, res) => {
  const { faqId, message } = req.body;
  const userId = req.user.id;

  const ticketId = generateTicketId();

  const ticket = await HelpSupport.create({
    userId,
    faqId,
    ticketId
  });

  await SupportMessage.create({
    ticketId,
    senderType: "CUSTOMER",
    message
  });

     // ✅ Create a complaint notification
  await Notification.create({
    user: userId,
    userType: "CustomerAuth",
    title: "Support Ticket Created",
    message: `Your support ticket ${ticketId} has been created. Our team will get back to you soon.`,
    type: "COMPLAINT"
  });


  res.status(201).json({
    success: true,
    message: "Ticket created",
    ticketId
  });
});

// POST /api/help-support/:ticketId/send
exports.sendSupportMessage = catchAsyncError(async (req, res) => {
  const { ticketId } = req.params;
  const { message } = req.body;
  const senderType = req.customer ? "CUSTOMER" : "USER";

  const ticket = await HelpSupport.findOne({ ticketId });
  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found" });
  }

  const newMsg = await SupportMessage.create({
    ticketId,
    senderType,
    message
  });

  res.status(200).json({
    success: true,
    message: "Message sent",
    chat: newMsg
  });
});
// GET /api/help-support/:ticketId/messages
exports.getSupportMessages = catchAsyncError(async (req, res) => {
  const { ticketId } = req.params;

  const messages = await SupportMessage.find({ ticketId }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    ticketId,
    messages
  });
});

// ✅ GET /api/help-support/my
exports.getMySupportTickets = catchAsyncError(async (req, res) => {
  const tickets = await HelpSupport.find({ userId: req.customer.id })
    .populate("faqId", "question")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    tickets
  });
});

exports.getsellerSupportTickets = catchAsyncError(async (req, res) => {
  const tickets = await HelpSupport.find({ userId: req.user.id })
    .populate("faqId", "question")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    tickets
  });
});

// ✅ GET /api/admin/help-support/all
exports.getAllTickets = catchAsyncError(async (req, res) => {
  const tickets = await HelpSupport.find()
    .populate("userId", "name email phoneNumber")
    .populate("faqId", "question")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    tickets
  });
});

// ✅ PUT /api/admin/help-support/:ticketId/resolve
// PUT /api/admin/help-support/:ticketId/resolve
exports.resolveTicket = catchAsyncError(async (req, res) => {
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
