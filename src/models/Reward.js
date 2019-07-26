const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Reward',
    {
        userId: {
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
            enum: ['benefeciary', 'curators', 'author', 'delegator'],
            required: true,
        },
        contentId: {
            userId: {
                type: String,
            },
            permlink: {
                type: String,
            },
        },
        tokenType: {
            type: String,
            enum: ['vesting', 'liquid'],
        },
        sym: {
            type: String,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                    type: 1,
                    _id: -1,
                },
            },
            {
                fields: {
                    userId: 1,
                    _id: -1,
                },
            },
        ],
    }
);
