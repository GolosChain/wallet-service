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
            required: true,
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
    },
    {
        index: [
            // by sender
            {
                fields: {
                    sender: 1,
                },
                options: {
                    unique: false,
                },
            },
            // by receiver
            {
                fields: {
                    receiver: 1,
                },
                options: {
                    unique: false,
                },
            },
        ],
    }
);
