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
                },
            },
        ],
    }
);
