const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Token',
    {
        sym: {
            type: String,
            required: true,
        },
        issuer: {
            type: String,
            required: true,
        },
        supply: {
            type: String,
            required: true,
        },
        max_supply: {
            type: String,
            required: true,
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
