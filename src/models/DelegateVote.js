const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;
const MongoBigNum = core.types.MongoBigNum;

module.exports = MongoDB.makeModel(
    'DelegateVote',
    {
        grantor: {
            type: String,
            required: true,
        },
        recipient: {
            type: String,
            required: true,
        },
        quantity: {
            type: MongoBigNum,
            required: true,
        },
        sym: {
            type: String,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    grantor: 1,
                    recipient: 1,
                    sym: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    grantor: 1,
                    recipient: 1,
                    sym: 1,
                },
                options: {
                    unique: true,
                    background: true,
                },
            },
        ],
    }
);
