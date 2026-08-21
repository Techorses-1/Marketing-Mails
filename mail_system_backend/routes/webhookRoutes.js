const express = require("express");
const router = express.Router();
const CampaignRecipient = require("../models/campaignRecipient");
const Campaign = require("../models/campaign");
const Contact = require("../models/contact");

// Terminal states that should never be downgraded by a later-arriving positive
// event (Delivery/Open/Click).
const TERMINAL_STATUSES = ["BOUNCED", "COMPLAINED", "CANCELLED"];

// POST /webhooks/ses - receives SNS notifications about SES events
router.post("/ses", express.json({ type: "*/*" }), async (req, res) => {
    try {
        const body = req.body;

        // ── Step 1: Handle SNS subscription confirmation (one-time handshake) ──
        if (body.Type === "SubscriptionConfirmation") {
            console.log("SNS Subscription confirmation received. SubscribeURL:", body.SubscribeURL);
            const https = require("https");
            https.get(body.SubscribeURL, (response) => {
                console.log("SNS subscription confirmed, status:", response.statusCode);
            });
            return res.status(200).send("Subscription confirmation received");
        }

        // ── Step 2: Handle actual notification events ──
        if (body.Type === "Notification") {
            const message = JSON.parse(body.Message);
            const eventType = message.eventType || message.notificationType;

            console.log("SES Event received:", eventType);

            const mail = message.mail;
            const providerMessageId = mail?.messageId;

            if (!providerMessageId) {
                console.log("No messageId found in event, skipping");
                return res.status(200).send("OK");
            }

            // Just used to confirm a matching row exists and to get campaignId for
            // the stats increment below - NOT used to make any status decisions.
            // All status/timestamp writes happen through atomic findOneAndUpdate
            // calls further down, so two events arriving milliseconds apart can
            // never race each other based on a stale in-memory copy.
            const existing = await CampaignRecipient.findOne({ providerMessageId }).select("campaignId contactId");

            if (!existing) {
                console.log("No matching CampaignRecipient found for messageId:", providerMessageId);
                return res.status(200).send("OK");
            }

            const { campaignId, contactId } = existing;

            // ── Handle Delivery ──
            if (eventType === "Delivery") {
                // Timestamp is always recorded (idempotent - only if not already set).
                await CampaignRecipient.updateOne(
                    { providerMessageId, deliveredAt: { $exists: false } },
                    { $set: { deliveredAt: new Date() } }
                );

                // Status only moves to DELIVERED if the CURRENT database state (checked
                // atomically at write time, not from a stale fetch) is not terminal.
                // This is the actual fix for the race - MongoDB evaluates the filter
                // against live data the instant it performs the write.
                const statusResult = await CampaignRecipient.updateOne(
                    { providerMessageId, status: { $nin: TERMINAL_STATUSES } },
                    { $set: { status: "DELIVERED" } }
                );

                if (statusResult.modifiedCount > 0) {
                    await Campaign.findOneAndUpdate(
                        { campaignId },
                        { $inc: { "statistics.delivered": 1 } }
                    );
                }
            }

            // ── Handle Bounce ──
            if (eventType === "Bounce") {
                const bounceType = message.bounce?.bounceType; // "Permanent" or "Transient"
                const failReason = message.bounce?.bounceSubType || "Bounced";

                // Only count/act once per recipient even if SNS redelivers the event.
                const result = await CampaignRecipient.updateOne(
                    { providerMessageId, bouncedAt: { $exists: false } },
                    {
                        $set: {
                            status: "BOUNCED",
                            bouncedAt: new Date(),
                            failReason
                        }
                    }
                );

                if (result.modifiedCount > 0) {
                    await Campaign.findOneAndUpdate(
                        { campaignId },
                        { $inc: { "statistics.bounced": 1 } }
                    );

                    // Only permanently suppress on hard (Permanent) bounces
                    if (bounceType === "Permanent") {
                        await Contact.findOneAndUpdate(
                            { contactId },
                            { status: "BOUNCED" }
                        );
                    }
                }
            }

            // ── Handle Complaint ──
            if (eventType === "Complaint") {
                const result = await CampaignRecipient.updateOne(
                    { providerMessageId, complainedAt: { $exists: false } },
                    {
                        $set: {
                            status: "COMPLAINED",
                            complainedAt: new Date()
                        }
                    }
                );

                if (result.modifiedCount > 0) {
                    await Campaign.findOneAndUpdate(
                        { campaignId },
                        { $inc: { "statistics.complained": 1 } }
                    );

                    // Complaints always result in permanent suppression
                    await Contact.findOneAndUpdate(
                        { contactId },
                        { status: "COMPLAINED" }
                    );
                }
            }

            // ── Handle Open ──
            if (eventType === "Open") {
                // Timestamp idempotent - only set once.
                const timestampResult = await CampaignRecipient.updateOne(
                    { providerMessageId, openedAt: { $exists: false } },
                    { $set: { openedAt: new Date() } }
                );

                if (timestampResult.modifiedCount > 0) {
                    await Campaign.findOneAndUpdate(
                        { campaignId },
                        { $inc: { "statistics.opened": 1 } }
                    );
                }

                // Don't downgrade status if already CLICKED or in a terminal state -
                // checked atomically against the live database row.
                await CampaignRecipient.updateOne(
                    { providerMessageId, status: { $nin: [...TERMINAL_STATUSES, "CLICKED"] } },
                    { $set: { status: "OPENED" } }
                );
            }

            // ── Handle Click ──
            if (eventType === "Click") {
                const timestampResult = await CampaignRecipient.updateOne(
                    { providerMessageId, clickedAt: { $exists: false } },
                    { $set: { clickedAt: new Date() } }
                );

                if (timestampResult.modifiedCount > 0) {
                    await Campaign.findOneAndUpdate(
                        { campaignId },
                        { $inc: { "statistics.clicked": 1 } }
                    );
                }

                await CampaignRecipient.updateOne(
                    { providerMessageId, status: { $nin: TERMINAL_STATUSES } },
                    { $set: { status: "CLICKED" } }
                );
            }

            return res.status(200).send("OK");
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).send("Error processing webhook");
    }
});

module.exports = router;