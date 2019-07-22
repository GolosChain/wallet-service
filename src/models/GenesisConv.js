const core = require('gls-core-service');
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
                    _id: -1,
                    userId: 1,
                },
            },
        ],
    }
);
