const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('ServiceMeta', {
    lastSequence: {
        type: Number,
        default: 0,
    },
    lastBlockTime: {
        type: Date,
        default: new Date(null),
    },
});
