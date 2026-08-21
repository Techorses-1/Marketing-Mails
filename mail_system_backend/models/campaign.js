const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const attachmentSchema = new mongoose.Schema(
    {
        fileName: {
            type: String,
            required: true
        },
        fileUrl: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            required: true
        },
        mimeType: {
            type: String
        }
    },
    { _id: false }
);

const senderSchema = new mongoose.Schema(
    {
        fromName: {
            type: String,
            required: true
        },
        fromEmail: {
            type: String,
            required: true
        },
        replyTo: {
            type: String,
            required: true
        }
    },
    { _id: false }
);

const statisticsSchema = new mongoose.Schema(
    {
        attempted: { type: Number, default: 0 },
        sent: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        bounced: { type: Number, default: 0 },
        complained: { type: Number, default: 0 },
        unsubscribed: { type: Number, default: 0 },
        opened: { type: Number, default: 0 },
        clicked: { type: Number, default: 0 }
    },
    { _id: false }
);

const campaignSchema = new mongoose.Schema(
    {
        campaignId: {
            type: String,
            unique: true,
            default: () => uuidv4(),
        },
        name: {
            type: String,
            required: [true, 'Campaign name is required'],
            trim: true
        },

        // Reference to template used (optional - campaign can have own content too)
        templateId: {
            type: String
        },

        // Snapshot of content at time of sending - NOT a live reference
        subject: {
            type: String,
            required: [true, 'Subject is required']
        },
        html: {
            type: String,
            required: [true, 'HTML content is required']
        },
        text: {
            type: String
        },
        attachments: {
            type: [attachmentSchema],
            default: []
        },

        // Pool of sender identities - rotated round-robin across recipients
        senderPool: {
            type: [senderSchema],
            required: [true, 'At least one sender is required'],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: 'senderPool must have at least one sender'
            }
        },

        // Target audience
        listId: {
            type: String,
            required: [true, 'listId is required']
        },

        status: {
            type: String,
            enum: ['DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED'],
            default: 'DRAFT'
        },

        scheduledAt: {
            type: Date
        },
        startedAt: {
            type: Date
        },
        completedAt: {
            type: Date
        },

        statistics: {
            type: statisticsSchema,
            default: () => ({})
        },

    },
    {
        timestamps: true
    }
);

campaignSchema.index({ status: 1 });
campaignSchema.index({ listId: 1 });
campaignSchema.index({ name: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);
module.exports = Campaign;