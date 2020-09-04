const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'DelegateVestingProposal',
    {
        communityId: {
            type: String,
            required: true,
        },
        proposer: {
            type: String,
            required: true,
        },
        proposalId: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        toUserId: {
            type: String,
            required: true,
        },
        isSignedByAuthor: {
            type: Boolean,
            required: true,
        },
        requested: {
            type: [
                {
                    userId: {
                        type: String,
                        required: true,
                    },
                    permission: {
                        type: String,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        data: {
            type: Object,
            required: true,
        },
        expiration: {
            type: Date,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                    proposalId: 1,
                },
                options: {
                    // unique: true,
                },
            },
            {
                fields: {
                    communityId: 1,
                    toUserId: 1,
                    expiration: 1,
                    isSignedByAuthor: 1,
                },
            },
            {
                fields: {
                    proposer: 1,
                    proposalId: 1,
                },
            },
        ],
    }
);
