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
                        default: 0
                    },
                    decs: {
                        type: Number,
                        default: 3
                    },
                    sym: {
                        type: String,
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