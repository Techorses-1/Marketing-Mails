const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const User = require("../../models/user");
const Contact = require("../../models/contact");
const List = require("../../models/list");
const ListMember = require("../../models/listMember");
const { logSuccess, logFailed } = require("../../utils/logHelper");

// ── Auth middleware (same pattern as adminRoutes.js) ──
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

// Multer setup - temp storage before parsing
const upload = multer({
    dest: path.join(__dirname, "../uploads/temp"),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedExts = [".csv", ".xlsx", ".xls"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExts.includes(ext)) {
            return cb(new Error("Only CSV, XLS, XLSX files are allowed"));
        }
        cb(null, true);
    }
});

// Basic email validation
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === "string" && emailRegex.test(email.trim());
};

// Parse CSV file into array of row objects
const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve(rows))
            .on("error", (err) => reject(err));
    });
};

// Parse Excel file into array of row objects
const parseExcel = (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
};

// POST /contacts - add a single contact manually via form
router.post("/", auth, requireContactsAccess, async (req, res) => {
    try {
        const { email, firstName, lastName, company, phone, listId } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ message: "A valid email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        let list = null;
        if (listId) {
            list = await List.findOne({ listId });
            if (!list) {
                return res.status(404).json({ message: "List not found" });
            }
        }

        // Reuse existing contact if email already exists, otherwise create new
        let contact = await Contact.findOne({ email: normalizedEmail });
        let isNewContact = false;

        if (!contact) {
            contact = new Contact({
                email: normalizedEmail,
                firstName: firstName || "",
                lastName: lastName || "",
                company: company || "",
                phone: phone || "",
                source: "manual"
            });
            await contact.save();
            isNewContact = true;
        }

        let addedToList = false;

        // If a list was chosen and contact isn't suppressed, link them via ListMember
        if (list && !["UNSUBSCRIBED", "BOUNCED", "COMPLAINED", "INVALID"].includes(contact.status)) {
            const existingMember = await ListMember.findOne({
                listId,
                contactId: contact.contactId
            });

            if (!existingMember) {
                await ListMember.create({
                    listId,
                    contactId: contact.contactId
                });
                addedToList = true;

                const memberCount = await ListMember.countDocuments({ listId });
                list.contactCount = memberCount;
                await list.save();
            }
        }

        await logSuccess({
            module: "Contacts",
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "Create",
            heading: isNewContact ? "Contact Added Manually" : "Existing Contact Linked",
            description: `Contact "${contact.email}" ${isNewContact ? "created" : "found"} manually by ${req.user.name}${list ? ` and added to list "${list.name}"` : ""}`
        });

        res.status(201).json({
            message: isNewContact ? "Contact created successfully" : "Contact already existed, linked to list",
            contact,
            addedToList
        });
    } catch (error) {
        console.error("Manual contact creation error:", error);

        await logFailed({
            module: "Contacts",
            userId: req.user?.userId || "SYSTEM",
            userName: req.user?.name || "SYSTEM",
            userEmail: req.user?.email || "SYSTEM",
            action: "Create",
            heading: "Manual Contact Creation Failed",
            description: error.message || "Unknown error occurred"
        });

        res.status(500).json({ message: "Failed to create contact", error: error.message });
    }
});

// POST /contacts/import
router.post("/import", auth, requireContactsAccess, upload.single("file"), async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        filePath = req.file.path;

        const { listId } = req.body;
        if (!listId) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: "listId is required" });
        }

        const list = await List.findOne({ listId });
        if (!list) {
            fs.unlinkSync(filePath);
            return res.status(404).json({ message: "List not found" });
        }

        // Parse based on file extension
        const ext = path.extname(req.file.originalname).toLowerCase();
        let rows = [];

        if (ext === ".csv") {
            rows = await parseCSV(filePath);
        } else {
            rows = parseExcel(filePath);
        }

        // Clean up temp file now that we've read it
        fs.unlinkSync(filePath);
        filePath = null;

        let totalRows = rows.length;
        let validCount = 0;
        let duplicateInFileCount = 0;
        let invalidCount = 0;
        let addedToListCount = 0;
        let alreadyInListCount = 0;

        const seenInFile = new Set();

        for (const row of rows) {
            // Try to find email column regardless of casing/naming (email, Email, EMAIL)
            const emailKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === "email"
            );
            const rawEmail = emailKey ? row[emailKey] : null;

            if (!rawEmail || !isValidEmail(rawEmail)) {
                invalidCount++;
                continue;
            }

            const normalizedEmail = rawEmail.trim().toLowerCase();

            if (seenInFile.has(normalizedEmail)) {
                duplicateInFileCount++;
                continue;
            }
            seenInFile.add(normalizedEmail);

            // Try to pick up common optional fields regardless of casing
            const getField = (names) => {
                for (const name of names) {
                    const key = Object.keys(row).find(
                        (k) => k.trim().toLowerCase() === name
                    );
                    if (key && row[key]) return String(row[key]).trim();
                }
                return "";
            };

            const firstName = getField(["firstname", "first_name", "first name"]);
            const lastName = getField(["lastname", "last_name", "last name"]);
            const company = getField(["company"]);
            const phone = getField(["phone"]);

            // Find existing contact or create new one
            let contact = await Contact.findOne({ email: normalizedEmail });

            if (!contact) {
                contact = new Contact({
                    email: normalizedEmail,
                    firstName,
                    lastName,
                    company,
                    phone,
                    source: "csv_import"
                });
                await contact.save();
            }

            validCount++;

            // Skip if contact is globally unsubscribed/bounced/complained - don't add to list
            if (["UNSUBSCRIBED", "BOUNCED", "COMPLAINED", "INVALID"].includes(contact.status)) {
                continue;
            }

            // Link to list via ListMember (skip if already a member)
            const existingMember = await ListMember.findOne({
                listId,
                contactId: contact.contactId
            });

            if (existingMember) {
                alreadyInListCount++;
            } else {
                await ListMember.create({
                    listId,
                    contactId: contact.contactId
                });
                addedToListCount++;
            }
        }

        // Update list's contactCount to reflect actual members
        const memberCount = await ListMember.countDocuments({ listId });
        list.contactCount = memberCount;
        await list.save();

        await logSuccess({
            module: "Contacts",
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "Create",
            heading: "Contacts Imported",
            description: `Imported ${addedToListCount} new contacts into list "${list.name}" (${totalRows} rows processed)`
        });

        res.status(200).json({
            message: "Import completed",
            result: {
                totalRows,
                valid: validCount,
                duplicateInFile: duplicateInFileCount,
                invalid: invalidCount,
                addedToList: addedToListCount,
                alreadyInList: alreadyInListCount
            }
        });
    } catch (error) {
        console.error("Import error:", error);

        // Clean up temp file if it still exists
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await logFailed({
            module: "Contacts",
            userId: req.user?.userId || "SYSTEM",
            userName: req.user?.name || "SYSTEM",
            userEmail: req.user?.email || "SYSTEM",
            action: "Create",
            heading: "Contact Import Failed",
            description: error.message || "Unknown error occurred"
        });

        res.status(500).json({
            message: "Import failed",
            error: error.message
        });
    }
});

// GET /contacts - list all with pagination
router.get("/", auth, requireContactsAccess, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const contacts = await Contact.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Contact.countDocuments();

        res.status(200).json({
            contacts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch contacts", error: error.message });
    }
});

// GET /contacts/:id
router.get("/:id", auth, requireContactsAccess, async (req, res) => {
    try {
        const contact = await Contact.findOne({ contactId: req.params.id });
        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }
        res.status(200).json({ contact });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch contact", error: error.message });
    }
});

// DELETE /contacts/:id
router.delete("/:id", auth, requireContactsAccess, async (req, res) => {
    try {
        const contact = await Contact.findOneAndDelete({ contactId: req.params.id });
        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }

        // Also remove from all lists and update their counts
        const memberships = await ListMember.find({ contactId: req.params.id });
        const listIds = [...new Set(memberships.map((m) => m.listId))];

        await ListMember.deleteMany({ contactId: req.params.id });

        for (const listId of listIds) {
            const count = await ListMember.countDocuments({ listId });
            await List.findOneAndUpdate({ listId }, { contactCount: count });
        }

        await logSuccess({
            module: "Contacts",
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "Delete",
            heading: "Contact Deleted",
            description: `Contact "${contact.email}" deleted by ${req.user.name}`
        });

        res.status(200).json({ message: "Contact deleted successfully" });
    } catch (error) {
        console.error("Delete contact error:", error);

        await logFailed({
            module: "Contacts",
            userId: req.user?.userId || "SYSTEM",
            userName: req.user?.name || "SYSTEM",
            userEmail: req.user?.email || "SYSTEM",
            action: "Delete",
            heading: "Contact Delete Failed",
            description: error.message || "Unknown error occurred"
        });

        res.status(500).json({ message: "Failed to delete contact", error: error.message });
    }
});

module.exports = router;