const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'VestingBalance',
    {
        account: {
            type: String,
            required: true,
        },
        vesting: {
            type: {
                amount: {
                    type: Number,
                    default: 0,
                    required: true,
                },
                decs: {
                    type: Number,
                    default: 3,
                    required: true,
                },
                sym: {
                    type: String,
                    required: true,
                },
            },
        },
        delegated: {
            type: {
                amount: {
                    type: Number,
                    default: 0,
                    required: true,
                },
                decs: {
                    type: Number,
                    default: 3,
                    required: true,
                },
                sym: {
                    type: String,
                    required: true,
                },
            },
        },
        received: {
            type: {
                amount: {
                    type: Number,
                    default: 0,
                    required: true,
                },
                decs: {
                    type: Number,
                    default: 3,
                    required: true,
                },
                sym: {
                    type: String,
                    required: true,
                },
            },
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    account: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
