const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Campaign = require("../models/campaign");
const Template = require("../models/template");
const List = require("../models/list");
const ListMember = require("../models/listMember");
const Contact = require("../models/contact");
const CampaignRecipient = require("../models/campaignRecipient");
const { renderTemplate } = require("../utils/personalize");
const emailQueue = require("../queues/emailQueue");

const UNSUBSCRIBE_BASE_URL = process.env.API_BASE_URL || "https://mail-system-backend.onrender.com";

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

const requireCampaignsAccess = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes("admin") || permissions.includes("campaigns")) {
        return next();
    }
    return res.status(403).json({ message: "Access denied. Campaigns permission required." });
};

router.post("/", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const {
            name,
            templateId,
            subject,
            html,
            text,
            senderPool,
            listId
        } = req.body;

        if (!name || !senderPool || !Array.isArray(senderPool) || senderPool.length === 0 || !listId) {
            return res.status(400).json({
                message: "name, senderPool (non-empty array of {fromName, fromEmail, replyTo}) and listId are required"
            });
        }

        const invalidSender = senderPool.find(
            (s) => !s.fromName || !s.fromEmail || !s.replyTo
        );
        if (invalidSender) {
            return res.status(400).json({
                message: "Each sender in senderPool must have fromName, fromEmail and replyTo"
            });
        }

        let finalSubject = subject;
        let finalHtml = html;
        let finalText = text;
        let finalAttachments = [];

        if (templateId) {
            const template = await Template.findOne({ templateId });
            if (!template) {
                return res.status(404).json({ message: "Template not found" });
            }
            finalSubject = finalSubject || template.subject;
            finalHtml = finalHtml || template.html;
            finalText = finalText || template.text;
            finalAttachments = template.attachments;
        }

        if (!finalSubject || !finalHtml) {
            return res.status(400).json({
                message: "subject and html are required (either directly or via templateId)"
            });
        }

        const list = await List.findOne({ listId });
        if (!list) {
            return res.status(404).json({ message: "List not found" });
        }

        const campaign = new Campaign({
            name,
            templateId,
            subject: finalSubject,
            html: finalHtml,
            text: finalText,
            attachments: finalAttachments,
            senderPool,
            listId,
            status: "DRAFT"
        });

        await campaign.save();

        res.status(201).json({ message: "Campaign created", campaign });
    } catch (error) {
        console.error("Campaign creation error:", error);
        res.status(500).json({ message: "Failed to create campaign", error: error.message });
    }
});

router.get("/", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 20, 1);
        const search = (req.query.search || "").trim();
        const status = (req.query.status || "").trim();

        const query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }
        if (status) {
            query.status = status;
        }

        const total = await Campaign.countDocuments(query);
        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            campaigns,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch campaigns", error: error.message });
    }
});

router.get("/:id", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ campaignId: req.params.id });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json({ campaign });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch campaign", error: error.message });
    }
});

router.patch("/:id", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ campaignId: req.params.id });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        if (campaign.status !== "DRAFT") {
            return res.status(400).json({ message: "Only DRAFT campaigns can be edited" });
        }

        const allowedFields = ["name", "subject", "html", "text", "senderPool", "listId"];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) campaign[field] = req.body[field];
        });

        await campaign.save();

        res.status(200).json({ message: "Campaign updated", campaign });
    } catch (error) {
        res.status(500).json({ message: "Failed to update campaign", error: error.message });
    }
});

router.get("/:id/preflight", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ campaignId: req.params.id });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const checks = {
            hasSubject: !!campaign.subject,
            hasContent: !!campaign.html,
            hasSenderPool: Array.isArray(campaign.senderPool) && campaign.senderPool.length > 0,
            listExists: false,
            listHasContacts: false
        };

        const list = await List.findOne({ listId: campaign.listId });
        checks.listExists = !!list;
        checks.listHasContacts = list ? list.contactCount > 0 : false;

        const allPassed = Object.values(checks).every((v) => v === true);

        res.status(200).json({ checks, readyToSend: allPassed });
    } catch (error) {
        res.status(500).json({ message: "Preflight check failed", error: error.message });
    }
});

router.post("/:id/send", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ campaignId: req.params.id });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        if (campaign.status !== "DRAFT") {
            return res.status(400).json({ message: "Only DRAFT campaigns can be sent" });
        }

        if (!Array.isArray(campaign.senderPool) || campaign.senderPool.length === 0) {
            return res.status(400).json({ message: "Campaign has no senders configured" });
        }

        const members = await ListMember.find({ listId: campaign.listId, status: "ACTIVE" });
        const contactIds = members.map((m) => m.contactId);

        const contacts = await Contact.find({
            contactId: { $in: contactIds },
            status: "ACTIVE"
        });

        if (contacts.length === 0) {
            return res.status(400).json({ message: "No active contacts to send to" });
        }

        campaign.status = "QUEUED";
        campaign.startedAt = new Date();
        campaign.statistics.attempted = contacts.length;
        await campaign.save();

        const senderPool = campaign.senderPool;
        let cumulativeDelay = 0;

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];

            const existingRecipient = await CampaignRecipient.findOne({
                campaignId: campaign.campaignId,
                contactId: contact.contactId
            });
            if (existingRecipient) continue;

            const recipient = await CampaignRecipient.create({
                campaignId: campaign.campaignId,
                contactId: contact.contactId,
                contactFirstName: contact.firstName,
                contactLastName: contact.lastName,
                contactEmail: contact.email,
                status: "PENDING"
            });

            const personalizedSubject = renderTemplate(campaign.subject, contact);
            const personalizedHtmlBody = renderTemplate(campaign.html, contact);
            const personalizedText = campaign.text ? renderTemplate(campaign.text, contact) : undefined;

            const unsubscribeUrl = `${UNSUBSCRIBE_BASE_URL}/unsubscribe/${contact.contactId}`;
            const unsubscribeFooter = `
                <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888;">
                    <p>Don't want to receive these emails? <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe here</a></p>
                </div>
            `;
            const personalizedHtml = personalizedHtmlBody + unsubscribeFooter;

            const personalizedTextWithUnsub = personalizedText
                ? `${personalizedText}\n\nUnsubscribe: ${unsubscribeUrl}`
                : undefined;

            const sender = senderPool[i % senderPool.length];

            const randomGap = 3000 + Math.floor(Math.random() * 5000);
            cumulativeDelay += randomGap;

            const job = await emailQueue.add(
                "send-email",
                {
                    campaignId: campaign.campaignId,
                    contactId: contact.contactId,
                    campaignRecipientId: recipient.campaignRecipientId,
                    to: contact.email,
                    fromName: sender.fromName,
                    fromEmail: sender.fromEmail,
                    replyTo: sender.replyTo,
                    subject: personalizedSubject,
                    html: personalizedHtml,
                    text: personalizedTextWithUnsub,
                    attachments: campaign.attachments
                },
                {
                    delay: cumulativeDelay
                }
            );

            recipient.status = "QUEUED";
            recipient.jobId = job.id;
            await recipient.save();
        }

        res.status(200).json({
            message: "Campaign queued for sending",
            campaign,
            recipientCount: contacts.length
        });
    } catch (error) {
        console.error("Campaign send error:", error);
        res.status(500).json({ message: "Failed to send campaign", error: error.message });
    }
});

// GET /campaigns/:id/recipients - paginated, with search (name/email) and status filter
router.get("/:id/recipients", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 20, 1);
        const search = (req.query.search || "").trim();
        const status = (req.query.status || "").trim();

        const query = { campaignId: req.params.id };
        if (status) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { contactFirstName: { $regex: search, $options: "i" } },
                { contactLastName: { $regex: search, $options: "i" } },
                { contactEmail: { $regex: search, $options: "i" } }
            ];
        }

        const total = await CampaignRecipient.countDocuments(query);
        const recipients = await CampaignRecipient.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            recipients,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch recipients", error: error.message });
    }
});

// GET /campaigns/:id/recipients/export - same filters as above, but NO pagination - returns everything matching
router.get("/:id/recipients/export", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const search = (req.query.search || "").trim();
        const status = (req.query.status || "").trim();

        const query = { campaignId: req.params.id };
        if (status) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { contactFirstName: { $regex: search, $options: "i" } },
                { contactLastName: { $regex: search, $options: "i" } },
                { contactEmail: { $regex: search, $options: "i" } }
            ];
        }

        const recipients = await CampaignRecipient.find(query).sort({ createdAt: -1 });

        res.status(200).json({ recipients });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch recipients for export", error: error.message });
    }
});

router.delete("/:id", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ campaignId: req.params.id });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        if (campaign.status !== "DRAFT") {
            return res.status(400).json({
                message: "Only DRAFT campaigns can be deleted. Use cancel for campaigns already sending."
            });
        }

        await Campaign.deleteOne({ campaignId: req.params.id });

        res.status(200).json({ message: "Campaign deleted successfully" });
    } catch (error) {
        console.error("Campaign delete error:", error);
        res.status(500).json({ message: "Failed to delete campaign", error: error.message });
    }
});

router.post("/:id/cancel", auth, requireCampaignsAccess, async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ campaignId: req.params.id });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        if (!["QUEUED", "SENDING"].includes(campaign.status)) {
            return res.status(400).json({
                message: "Only QUEUED or SENDING campaigns can be cancelled"
            });
        }

        const unfinishedRecipients = await CampaignRecipient.find({
            campaignId: campaign.campaignId,
            status: { $in: ["PENDING", "QUEUED"] }
        });

        let removedCount = 0;

        for (const recipient of unfinishedRecipients) {
            if (recipient.jobId) {
                try {
                    const job = await emailQueue.getJob(recipient.jobId);
                    if (job) {
                        const state = await job.getState();
                        if (state === "delayed" || state === "waiting") {
                            await job.remove();
                            removedCount++;
                        }
                    }
                } catch (jobError) {
                    console.error(`Failed to remove job ${recipient.jobId}:`, jobError.message);
                }
            }

            recipient.status = "CANCELLED";
            await recipient.save();
        }

        campaign.status = "CANCELLED";
        await campaign.save();

        res.status(200).json({
            message: `Campaign cancelled. ${removedCount} pending email(s) removed from the queue before they were sent.`,
            campaign
        });
    } catch (error) {
        console.error("Campaign cancel error:", error);
        res.status(500).json({ message: "Failed to cancel campaign", error: error.message });
    }
});

module.exports = router;