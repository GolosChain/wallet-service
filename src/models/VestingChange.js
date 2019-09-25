const core = require('cyberway-core-service');
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
        blockNum: {
            type: Number,
            required: true,
        },
        trxId: {
            type: String,
            default: null,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        isIrreversible: {
            type: Boolean,
            default: false,
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
            // for irreversible search
            {
                fields: {
                    blockNum: 1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
