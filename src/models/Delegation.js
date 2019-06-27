const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Delegation',
    {
        from: {
            type: String,
            required: true,
        },
        to: {
            type: String,
            required: true,
        },
        quantity: {
            type: String,
            required: true,
        },
        interestRate: {
            type: Number,
            enum: [0, 1],
        },
        isActual: {
            type: Boolean,
            default: true,
        },
    },
    {
        index: [
            {
                fields: {
                    from: 1,
                    to: 1,
                    _id: -1,
                },
                options: {
                    unique: false,
                },
            },
        ],
    }
);
