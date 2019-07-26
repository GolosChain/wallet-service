const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Balance',
    {
        name: {
            type: String,
        },
        balances: {
            type: [
                {
                    type: String,
                    required: true,
                },
            ],
        },
        payments: {
            type: [
                {
                    type: String,
                    required: true,
                },
            ],
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    name: 1,
                },
                options: {
                    unique: true,
                    background: true,
                },
            },
        ],
    }
);
