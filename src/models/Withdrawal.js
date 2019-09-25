const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Withdrawal',
    {
        owner: {
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
        withdraw_rate: {
            type: String,
            required: true,
        },
        remaining_payments: {
            type: Number,
            required: true,
        },
        interval_seconds: {
            type: Number,
            required: true,
        },
        next_payout: {
            type: Date,
            required: true,
        },
        to_withdraw: {
            type: String,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    owner: 1,
                },
                options: {
                    unique: true,
                    background: true,
                },
            },
        ],
    }
);
