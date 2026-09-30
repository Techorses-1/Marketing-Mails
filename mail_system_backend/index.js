const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/mongodb");
require("dotenv").config();

process.env.TZ = 'Asia/Kolkata';

const app = express();

// Connect to MongoDB
connectDB();

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://marketingmails.techorses.com",
        ],
        credentials: true,
    })
);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files (template attachments)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== IMPORT ROUTES ==========
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contact/contactRoutes");
const listRoutes = require("./routes/contact/listRoutes");
const templateRoutes = require("./routes/templateRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const unsubscribeRoutes = require("./routes/unsubscribeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// ========== USE ROUTES ==========
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

app.use('/contacts', contactRoutes);
app.use('/lists', listRoutes);
app.use('/templates', templateRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/unsubscribe', unsubscribeRoutes);
app.use('/dashboard', dashboardRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("New Bulk Email System is Running OKk! 📧");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});