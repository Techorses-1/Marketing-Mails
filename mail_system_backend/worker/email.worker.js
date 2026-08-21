const { Worker } = require("bullmq");
const connection = require("../config/redis");
const { sendEmail } = require("../providers/ses/ses.service");
const CampaignRecipient = require("../models/campaignRecipient");
const Campaign = require("../models/campaign");
const connectDB = require("../config/mongodb");

require("dotenv").config();

connectDB();

if (process.env.NEED_DUMMY_SERVER === "true") {
    const express = require("express");
    const app = express();
    app.get("/", (req, res) => {
        res.send("Worker is running");
    });
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
        console.log(`Dummy server listening on port ${PORT} (keeps Render happy)`);
    });
}

const checkAndCompleteCampaign = async (campaignId) => {
    if (!campaignId) return;

    const campaign = await Campaign.findOne({ campaignId });
    if (!campaign || campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
        return;
    }

    const unfinishedCount = await CampaignRecipient.countDocuments({
        campaignId,
        status: { $in: ["PENDING", "QUEUED"] }
    });

    if (unfinishedCount === 0) {
        campaign.status = "COMPLETED";
        campaign.completedAt = new Date();
        await campaign.save();
        console.log(`Campaign ${campaignId} marked COMPLETED`);
    }
};

const emailWorker = new Worker(
    "email-send",
    async (job) => {
        const { to, fromName, fromEmail, replyTo, subject, html, text, attachments, campaignRecipientId, campaignId } = job.data;

        console.log(`Processing job ${job.id} - sending to ${to}`);

        // Flip campaign from QUEUED to SENDING the moment the first job actually starts processing.
        // The condition only matches while status is still QUEUED, so this only fires once per campaign.
        if (campaignId) {
            await Campaign.findOneAndUpdate(
                { campaignId, status: "QUEUED" },
                { status: "SENDING" }
            );
        }

        try {
            const result = await sendEmail({ to, fromName, fromEmail, replyTo, subject, html, text, attachments });

            console.log(`Sent to ${to}, messageId: ${result.messageId}`);

            if (campaignRecipientId) {
                await CampaignRecipient.findOneAndUpdate(
                    { campaignRecipientId },
                    {
                        status: "SENT",
                        sentAt: new Date(),
                        providerMessageId: result.messageId
                    }
                );

                if (campaignId) {
                    await Campaign.findOneAndUpdate(
                        { campaignId },
                        { $inc: { "statistics.sent": 1 } }
                    );
                }
            }

            return result;
        } finally {
            if (campaignRecipientId) {
                await CampaignRecipient.findOneAndUpdate(
                    { campaignRecipientId, status: { $in: ["PENDING", "QUEUED"] } },
                    { status: "FAILED", failReason: "Send failed" }
                );
            }
            await checkAndCompleteCampaign(campaignId);
        }
    },
    {
        connection,
        concurrency: 5,
        limiter: {
            max: 10,
            duration: 1000
        }
    }
);

emailWorker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed. Message ID: ${result.messageId}`);
});

emailWorker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
});

console.log("Email worker started, listening for jobs...");

module.exports = emailWorker;