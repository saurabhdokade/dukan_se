const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors"); // <--- Added

// Enable CORS
// Enable CORS for a specific origin
app.use(cors({
  origin: "*", // <-- exact frontend path
  credentials: true
}));

// Middlewares
const errorMiddleware = require("./middlewares/error");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const faqRoutes = require("./routes/faqRoutes"); // <--- Added FAQ
const helpRoutes = require("./routes/helpRoutes"); // <--- Added Help Support
const adminRoutes = require("./routes/adminRoutes"); // <--- Added Admin Routes
// Parsing middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


// Routes
app.use("/api/v1", productRoutes);
app.use("/api/v1", faqRoutes); // <--- Added FAQ routes
app.use("/api/v1", helpRoutes); // <--- Added Help Support routes
app.use("/api/v1", cartRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/v1", customerRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", adminRoutes); // <--- Added Admin routes

// Error middleware
app.use(errorMiddleware);

module.exports = app;
