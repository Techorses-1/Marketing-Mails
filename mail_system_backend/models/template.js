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
            type: Number,   // in bytes
            required: true
        },
        mimeType: {
            type: String
        }
    },
    { _id: false }
);

const templateSchema = new mongoose.Schema(
    {
        templateId: {
            type: String,
            unique: true,
            default: () => uuidv4(),
        },
        name: {
            type: String,
            required: [true, 'Template name is required'],
            trim: true
        },
        subject: {
            type: String,
            required: [true, 'Subject is required'],
            trim: true
        },
        html: {
            type: String,
            required: [true, 'HTML content is required']
        },
        text: {
            type: String   // plain text fallback version
        },
        variables: {
            type: [String],   // e.g. ["first_name", "company"]
            default: []
        },
        attachments: {
            type: [attachmentSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

const Template = mongoose.model('Template', templateSchema);
module.exports = Template;