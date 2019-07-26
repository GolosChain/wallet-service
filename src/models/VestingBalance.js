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
            type: String,
            required: true,
        },
        delegated: {
            type: String,
            required: true,
        },
        received: {
            type: String,
            required: true,
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
                    background: true,
                },
            },
        ],
    }
);
