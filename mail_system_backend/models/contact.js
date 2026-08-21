const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const contactSchema = new mongoose.Schema(
    {
        contactId: {
            type: String,
            unique: true,
            default: () => uuidv4(),
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true
        },
        firstName: {
            type: String,
            trim: true
        },
        lastName: {
            type: String,
            trim: true
        },
        company: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'INVALID'],
            default: 'ACTIVE'
        },
        source: {
            type: String,
            default: 'manual'
        },
        customFields: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate emails
contactSchema.index({ email: 1 }, { unique: true });
contactSchema.index({ status: 1 });

const Contact = mongoose.model('Contact', contactSchema);
module.exports = Contact;