const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../../models/user");
const List = require("../../models/list");
const ListMember = require("../../models/listMember");
const Contact = require("../../models/contact");

// ── Auth middleware (same pattern as adminRoutes.js / contactRoutes.js) ──
const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ userId: decoded.userId });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({ message: "Invalid token" });
    }
};

// ── Permission check: admin can access everything, others need 'contacts' permission ──
const requireContactsAccess = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes("admin") || permissions.includes("contacts")) {
        return next();
    }
    return res.status(403).json({ message: "Access denied. Contacts permission required." });
};

// POST /lists - create a new list
router.post("/", auth, requireContactsAccess, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: "List name is required" });
        }

        const list = new List({ name, description });
        await list.save();

        res.status(201).json({ message: "List created", list });
    } catch (error) {
        res.status(500).json({ message: "Failed to create list", error: error.message });
    }
});

// GET /lists - get all lists
router.get("/", auth, requireContactsAccess, async (req, res) => {
    try {
        const lists = await List.find().sort({ createdAt: -1 });
        res.status(200).json({ lists });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch lists", error: error.message });
    }
});

// GET /lists/:id/contacts - get all contacts in a specific list
router.get("/:id/contacts", auth, requireContactsAccess, async (req, res) => {
    try {
        const members = await ListMember.find({ listId: req.params.id, status: "ACTIVE" });
        const contactIds = members.map((m) => m.contactId);

        const contacts = await Contact.find({ contactId: { $in: contactIds } });

        res.status(200).json({ contacts });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch list contacts", error: error.message });
    }
});

module.exports = router;