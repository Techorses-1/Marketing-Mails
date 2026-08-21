const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const logsSchema = new mongoose.Schema({
    logId: {
        type: String,
        unique: true,
        default: () => uuidv4(),
    },
    module: {
        type: String,
        required: [true, 'Module is required'],
        enum: [
            'Authentication',
            'Admin',
            'Contacts',
            'Auth',
            'Campaigns',
        ],
    },
    userId: {
        type: String,
        required: [true, 'User ID is required'],
    },
    userName: {
        type: String,
        required: [true, 'User name is required']
    },
    userEmail: {
        type: String,
        required: [true, 'User email is required']
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: [
            'Create',
            'Update',
            'Delete',
        ],
    },
    heading: {
        type: String,
        required: [true, 'Heading is required'],
        trim: true
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['success', 'failed'],
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// ✅ Indexes for better query performance
logsSchema.index({ module: 1, timestamp: -1 });
logsSchema.index({ userId: 1, timestamp: -1 });
logsSchema.index({ status: 1, timestamp: -1 });
logsSchema.index({ createdAt: -1 });

const Log = mongoose.models.Log || mongoose.model('Log', logsSchema);

module.exports = Log;