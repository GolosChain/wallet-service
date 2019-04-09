const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Token',
    {
        sym: {
            type: String,
        },
        issuer: {
            type: String,
        },
        supply: {
            type: {
                amount: {
                    type: Number,
                    default: 0,
                },
                decs: {
                    type: Number,
                },
            },
        },
        max_supply: {
            type: {
                amount: {
                    type: Number,
                    default: 0,
                },
                decs: {
                    type: Number,
                },
            },
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    sym: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
