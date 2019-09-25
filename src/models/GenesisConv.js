const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'GenesisConv',
    {
        userId: {
            type: String,
            required: true,
        },
        sum: {
            type: String,
            required: true,
        },
        quantity: {
            type: String,
            required: true,
        },
        memo: {
            type: String,
        },
        sources: {
            type: Object,
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    userId: 1,
                    _id: 1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
