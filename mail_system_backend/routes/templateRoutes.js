const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Template = require("../models/template");
const baseTemplates = require("../data/baseTemplates");
const { logSuccess, logFailed } = require("../utils/logHelper");

// ── Auth middleware (same pattern as adminRoutes.js / contactRoutes.js / listRoutes.js) ──
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

// ── Permission check: admin can access everything, others need 'campaigns' permission ──
const requireCampaignsAccess = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes("admin") || permissions.includes("campaigns")) {
        return next();
    }
    return res.status(403).json({ message: "Access denied. Campaigns permission required." });
};

// ── Storage for downloadable template attachments - permanent, not temp ──
const attachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../uploads/attachments");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9._-]/g, "");
        const uniqueName = `${Date.now()}-${safeName}`;
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage: attachmentStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

// ── Storage for content images (banner/inline images used INSIDE the email HTML,
// e.g. Gallery templates and the drag-and-drop Builder) - separate from
// downloadable "attachments" above ──
const contentImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../uploads/content-images");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9._-]/g, "");
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const uploadContentImage = multer({
    storage: contentImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB - these are inline images, not big files
});

// POST /templates - create a new template (with optional attachments)
router.post("/", auth, requireCampaignsAccess, upload.array("attachments", 5), async (req, res) => {
    try {
        const { name, subject, html, text, variables } = req.body;
        if (!name || !subject || !html) {
            return res.status(400).json({ message: "name, subject and html are required" });
        }

        const attachments = (req.files || []).map((file) => ({
            fileName: file.originalname,
            fileUrl: `/uploads/attachments/${file.filename}`,
            fileSize: file.size,
            mimeType: file.mimetype
        }));

        const template = new Template({
            name,
            subject,
            html,
            text,
            variables: variables ? JSON.parse(variables) : [],
            attachments
        });

        await template.save();

        await logSuccess({
            module: "Campaigns",
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "Create",
            heading: "Template Created",
            description: `Template "${name}" created${attachments.length ? ` with ${attachments.length} attachment(s)` : ""}`
        });

        res.status(201).json({ message: "Template created", template });
    } catch (error) {
        console.error("Template creation error:", error);

        await logFailed({
            module: "Campaigns",
            userId: req.user?.userId || "SYSTEM",
            userName: req.user?.name || "SYSTEM",
            userEmail: req.user?.email || "SYSTEM",
            action: "Create",
            heading: "Template Creation Failed",
            description: error.message || "Unknown error occurred"
        });

        res.status(500).json({ message: "Failed to create template", error: error.message });
    }
});

// GET /templates - get all templates
router.get("/", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const templates = await Template.find().sort({ createdAt: -1 });
        res.status(200).json({ templates });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch templates", error: error.message });
    }
});

// GET /templates/base - list pre-designed gallery templates (Option 3)
// IMPORTANT: this must be defined BEFORE "/:id" below, otherwise Express
// would try to match "base" as a templateId.
router.get("/base", auth, requireCampaignsAccess, (req, res) => {
    res.status(200).json({ baseTemplates });
});

// POST /templates/upload-image - upload a single inline/content image, used by
// the Gallery fill-form and the drag-and-drop Builder. Also defined before "/:id".
router.post("/upload-image", auth, requireCampaignsAccess, uploadContentImage.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
    }
    res.status(200).json({ imageUrl: `/uploads/content-images/${req.file.filename}` });
});

// GET /templates/:id - get single template
router.get("/:id", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const template = await Template.findOne({ templateId: req.params.id });
        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }
        res.status(200).json({ template });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch template", error: error.message });
    }
});

// PATCH /templates/:id - update template (supports adding new attachments + removing existing ones)
router.patch("/:id", auth, requireCampaignsAccess, upload.array("attachments", 5), async (req, res) => {
    try {
        const { name, subject, html, text, variables, removeAttachments } = req.body;

        const template = await Template.findOne({ templateId: req.params.id });
        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        // ── Handle removal of existing attachments (removeAttachments = JSON array of fileUrl strings) ──
        if (removeAttachments) {
            const urlsToRemove = JSON.parse(removeAttachments);

            for (const att of template.attachments) {
                if (urlsToRemove.includes(att.fileUrl)) {
                    const filePath = path.join(__dirname, "..", att.fileUrl);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            }

            template.attachments = template.attachments.filter(
                (att) => !urlsToRemove.includes(att.fileUrl)
            );
        }

        // ── Handle newly uploaded attachments - append to whatever remains ──
        if (req.files && req.files.length > 0) {
            const newAttachments = req.files.map((file) => ({
                fileName: file.originalname,
                fileUrl: `/uploads/attachments/${file.filename}`,
                fileSize: file.size,
                mimeType: file.mimetype
            }));

            const totalAfterAdd = template.attachments.length + newAttachments.length;
            if (totalAfterAdd > 5) {
                for (const file of req.files) {
                    const filePath = path.join(__dirname, "../uploads/attachments", file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                return res.status(400).json({
                    message: `A template can have at most 5 attachments (currently ${template.attachments.length}, tried to add ${newAttachments.length})`
                });
            }

            template.attachments.push(...newAttachments);
        }

        if (name) template.name = name;
        if (subject) template.subject = subject;
        if (html) template.html = html;
        if (text !== undefined) template.text = text;
        if (variables) template.variables = JSON.parse(variables);

        await template.save();

        await logSuccess({
            module: "Campaigns",
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "Update",
            heading: "Template Updated",
            description: `Template "${template.name}" updated by ${req.user.name}`
        });

        res.status(200).json({ message: "Template updated", template });
    } catch (error) {
        console.error("Template update error:", error);

        await logFailed({
            module: "Campaigns",
            userId: req.user?.userId || "SYSTEM",
            userName: req.user?.name || "SYSTEM",
            userEmail: req.user?.email || "SYSTEM",
            action: "Update",
            heading: "Template Update Failed",
            description: error.message || "Unknown error occurred"
        });

        res.status(500).json({ message: "Failed to update template", error: error.message });
    }
});

// DELETE /templates/:id
router.delete("/:id", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const template = await Template.findOneAndDelete({ templateId: req.params.id });
        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        for (const att of template.attachments) {
            const filePath = path.join(__dirname, "..", att.fileUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await logSuccess({
            module: "Campaigns",
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "Delete",
            heading: "Template Deleted",
            description: `Template "${template.name}" deleted by ${req.user.name}`
        });

        res.status(200).json({ message: "Template deleted successfully" });
    } catch (error) {
        console.error("Template delete error:", error);

        await logFailed({
            module: "Campaigns",
            userId: req.user?.userId || "SYSTEM",
            userName: req.user?.name || "SYSTEM",
            userEmail: req.user?.email || "SYSTEM",
            action: "Delete",
            heading: "Template Delete Failed",
            description: error.message || "Unknown error occurred"
        });

        res.status(500).json({ message: "Failed to delete template", error: error.message });
    }
});

module.exports = router;