const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'VestingStat',
    {
        amount: {
            type: Number,
            required: true,
        },
        decs: {
            type: Number,
            required: true,
        },
        sym: {
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
