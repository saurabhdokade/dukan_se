const express = require("express");
const router = express.Router();
const {
  createSupportTicket,
  getMySupportTickets,
  getAllTickets,
  sendSupportMessage,
  resolveTicket,
  getSupportMessages,
  createsellerSupportTicket,
  getsellerSupportTickets
} = require("../controller/helpController");

const { isAuthenticatedCustomer, isAuthenticatedUser } = require("../middlewares/auth");

router.post("/create/help", isAuthenticatedCustomer, createSupportTicket);
router.post("/send/message/:ticketId", isAuthenticatedCustomer, sendSupportMessage);
router.get("/getmessages/:ticketId",getSupportMessages)
router.get("/mytickets", isAuthenticatedCustomer, getMySupportTickets);

//seller tickets support
// createsellerSupportTicket
router.post("/create/seller/help", isAuthenticatedUser, createsellerSupportTicket);
router.get("/myseller/tickets", isAuthenticatedUser, getsellerSupportTickets);

// Admin APIs
router.get("/alltickets", isAuthenticatedUser, getAllTickets);
router.put("/resolve/:ticketId", isAuthenticatedUser, resolveTicket);
module.exports = router;
