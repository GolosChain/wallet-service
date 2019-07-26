const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'VestingChange',
    {
        who: {
            type: String,
            required: true,
        },
        diff: {
            type: String,
            required: true,
        },
        block: {
            type: Number,
            required: true,
        },
        trx_id: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    who: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
