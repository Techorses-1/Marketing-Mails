const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const listSchema = new mongoose.Schema(
    {
        listId: {
            type: String,
            unique: true,
            default: () => uuidv4(),
        },
        name: {
            type: String,
            required: [true, 'List name is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        contactCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

const List = mongoose.model('List', listSchema);
module.exports = List;