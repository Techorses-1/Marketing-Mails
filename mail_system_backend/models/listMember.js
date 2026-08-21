const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const listMemberSchema = new mongoose.Schema(
    {
        listMemberId: {
            type: String,
            unique: true,
            default: () => uuidv4(),
        },
        listId: {
            type: String,
            required: [true, 'listId is required']
        },
        contactId: {
            type: String,
            required: [true, 'contactId is required']
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'UNSUBSCRIBED'],
            default: 'ACTIVE'
        }
    },
    {
        timestamps: true
    }
);

// Prevent same contact being added twice to the same list
listMemberSchema.index({ listId: 1, contactId: 1 }, { unique: true });
listMemberSchema.index({ listId: 1 });
listMemberSchema.index({ contactId: 1 });

const ListMember = mongoose.model('ListMember', listMemberSchema);
module.exports = ListMember;