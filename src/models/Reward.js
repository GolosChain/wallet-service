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
        blockNum: {
            type: Number,
            required: true,
        },
        trxId: {
            type: String,
            default: null,
        },
        isIrreversible: {
            type: Boolean,
            default: false,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        type: {
            type: String,
            enum: ['benefeciary', 'curators', 'author', 'delegator', 'unsent'],
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
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    userId: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            // for irreversible search
            {
                fields: {
                    blockNum: 1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
