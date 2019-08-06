const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'VestingParams',
    {
        intervals: {
            type: Number,
            required: true,
        },
        interval_seconds: {
            type: Number,
            required: true,
        },
    },
    {
        // index
    }
);
