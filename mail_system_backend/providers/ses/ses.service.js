const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
const nodemailer = require("nodemailer");

// Create the SESv2 client once - reused across all send calls
const sesClient = new SESv2Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Nodemailer transport used ONLY to build the raw MIME message - it does NOT
// actually send anything itself, SES does the real sending below
const mimeBuilder = nodemailer.createTransport({
    SES: {
        sesClient,
        SendEmailCommand
    }
});

/**
 * Sends a single email via Amazon SES (supports attachments)
 * @param {Object} params
 * @param {string} params.to - recipient email
 * @param {string} params.fromName - display name (e.g. "Techorses")
 * @param {string} params.fromEmail - sender email (must be @ verified domain)
 * @param {string} params.replyTo - reply-to email
 * @param {string} params.subject - email subject
 * @param {string} params.html - email HTML body
 * @param {string} [params.text] - plain text fallback (optional)
 * @param {Array} [params.attachments] - array of { fileName, fileUrl } (optional)
 * @returns {Promise<{messageId: string}>}
 */
const sendEmail = async ({ to, fromName, fromEmail, replyTo, subject, html, text, attachments }) => {
    const mailAttachments = (attachments || []).map((att) => {
        // encodeURI() ensures spaces/special characters in the file path become
        // valid URL-encoded characters (e.g. " " -> "%20"). Without this, filenames
        // with spaces produced a broken URL that nodemailer/SES couldn't fetch,
        // resulting in "Invalid status code 404" when the worker tried to send.
        const resolvedPath = att.fileUrl.startsWith("http")
            ? att.fileUrl
            : `${process.env.API_BASE_URL || "https://mail-system-backend.onrender.com"}${encodeURI(att.fileUrl)}`;

        return {
            filename: att.fileName,
            path: resolvedPath
        };
    });

    const info = await mimeBuilder.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to,
        replyTo,
        subject,
        html,
        text,
        attachments: mailAttachments,
        ses: {
            ConfigurationSetName: "techorses-tracking"
        }
    });

    // FIX: nodemailer wraps SES's messageId in angle brackets and appends a fake
    // "@region.amazonses.com" suffix (RFC822 Message-ID style), e.g.
    //   <011001a00f52ae5c-...-000000@eu-north-1.amazonses.com>
    // But the actual SNS webhook event (mail.messageId) contains only the raw ID:
    //   011001a00f52ae5c-...-000000
    // Since campaignRoutes.js saves info.messageId as providerMessageId and the
    // webhook does CampaignRecipient.findOne({ providerMessageId }), the two
    // formats never matched - so Delivery/Bounce/Open/Click events were always
    // silently dropped ("No matching CampaignRecipient found") and status stayed
    // stuck on "SENT" forever. Strip the wrapping so both sides use the same raw ID.
    const rawMessageId = info.messageId.replace(/^<|>$/g, "").split("@")[0];

    return {
        messageId: rawMessageId
    };
};

module.exports = { sendEmail };