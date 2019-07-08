const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Reward',
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
            enum: ['transfer', 'benefeciary', 'curators', 'author', 'delegator'],
            default: 'transfer',
        },
        contentType: {
            type: String,
            enum: ['comment', 'post'],
        },
        contentId: {
            userId: {
                type: String,
            },
            permlink: {
                type: String,
            },
        },
        token: {
            sym: {
                type: String,
                default: 'GOLOS',
            },
            type: {
                type: String,
                enum: ['vesting', 'liquid'],
            },
        },
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
