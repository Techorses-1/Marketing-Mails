const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const campaignRecipientSchema = new mongoose.Schema(
    {
        campaignRecipientId: {
            type: String,
            unique: true,
            default: () => uuidv4(),
        },
        campaignId: {
            type: String,
            required: [true, 'campaignId is required']
        },
        contactId: {
            type: String,
            required: [true, 'contactId is required']
        },
        // Contact details denormalized for performance and historical record
        contactFirstName: {
            type: String,
            trim: true
        },
        contactLastName: {
            type: String,
            trim: true
        },
        contactEmail: {
            type: String,
            lowercase: true,
            trim: true
        },

        status: {
            type: String,
            enum: ['PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED', 'OPENED', 'CLICKED', 'CANCELLED'],
            default: 'PENDING'
        },

        // SES's own message ID - used to match incoming webhook events back to this record
        providerMessageId: {
            type: String
        },

        // BullMQ job ID - used to find and remove this specific job from Redis if the campaign is cancelled
        jobId: {
            type: String
        },

        sentAt: {
            type: Date
        },
        deliveredAt: {
            type: Date
        },
        openedAt: {
            type: Date
        },
        clickedAt: {
            type: Date
        },
        // ADDED: exact timestamp of when a bounce/complaint event was received - previously
        // bounces only had failReason (no time) and complaints had no timestamp at all.
        bouncedAt: {
            type: Date
        },
        complainedAt: {
            type: Date
        },
        failReason: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

// One recipient row per contact per campaign - prevents duplicate sends
campaignRecipientSchema.index({ campaignId: 1, contactId: 1 }, { unique: true });
campaignRecipientSchema.index({ campaignId: 1, status: 1 });
campaignRecipientSchema.index({ providerMessageId: 1 });
campaignRecipientSchema.index({ contactEmail: 1 });
campaignRecipientSchema.index({ contactFirstName: 1, contactLastName: 1 });

const CampaignRecipient = mongoose.model('CampaignRecipient', campaignRecipientSchema);
module.exports = CampaignRecipient;