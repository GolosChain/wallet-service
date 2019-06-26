const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Transfer',
    {
        sender: {
            type: String,
            required: true,
        },
        receiver: {
            type: String,
            required: true,
        },
        quantity: {
            type: String,
            required: true,
        },
        memo: {
            type: String,
        },
        block: {
            type: Number,
            required: true,
        },
        trx_id: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        type: {
            type: String,
            enum: ['transfer', 'author', 'curator', 'benefeciary'],
            default: 'transfer',
        },

        // following fields are for reward transfers
        contentType: {
            type: String,
            enum: ['post', 'comment'],
        },
        author: String,
        permlink: String,
    },
    {
        index: [
            {
                fields: {
                    sender: 1,
                    receiver: 1,
                    _id: -1,
                },
                options: {
                    unique: false,
                },
            },
        ],
    }
);
