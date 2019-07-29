const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'UserMeta',
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            default: null,
        },
        name: {
            type: String,
            default: null,
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                },
                options: {
                    unique: true,
                    background: true,
                },
            },
        ],
    }
);
