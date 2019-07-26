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
        sym: {
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
    },
    {
        index: [
            {
                fields: {
                    sender: 1,
                    receiver: 1,
                    sym: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    receiver: 1,
                    sym: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    sender: 1,
                    sym: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    sym: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
