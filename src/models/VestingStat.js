const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'VestingStat',
    {
        stat: {
            type: String,
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
                    // unique: true,
                    background: true,
                },
            },
        ],
    }
);
