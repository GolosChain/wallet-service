const core = require('cyberway-core-service');
const BasicConnector = core.services.Connector;
const Wallet = require('../controllers/Wallet');

class Connector extends BasicConnector {
    constructor({ rpcActualizer }) {
        super();

        this._wallet = new Wallet({ connector: this, rpcActualizer });
    }

    async start() {
        await super.start({
            serverRoutes: {
                getValidators: {
                    inherits: ['userRelativity'],
                    handler: this._wallet.getValidators,
                    scope: this._wallet,
                },
                getBalance: {
                    inherits: ['userSpecific'],
                    handler: this._wallet.getBalance,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                            type: {
                                type: 'string',
                                enum: ['all', 'liquid', 'vesting'],
                                default: 'all',
                            },
                            includeVestingDelegationProposals: {
                                type: 'boolean',
                                default: false,
                            },
                        },
                    },
                },
                getTransferHistory: {
                    inherits: ['userSpecific', 'pagination'],
                    handler: this._wallet.getTransferHistory,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                            direction: {
                                type: 'string',
                                enum: ['in', 'out', 'all'],
                                default: 'all',
                            },
                        },
                    },
                },
                getTokensInfo: {
                    inherits: ['pagination'],
                    handler: this._wallet.getTokensInfo,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                        },
                    },
                },
                getVestingInfo: {
                    handler: this._wallet.getVestingInfo,
                    scope: this._wallet,
                },
                getVestingSupplyAndBalance: {
                    handler: this._wallet.getVestingSupplyAndBalance,
                    scope: this._wallet,
                },
                getVestingHistory: {
                    inherits: ['userSpecific', 'pagination'],
                    handler: this._wallet.getVestingHistory,
                    scope: this._wallet,
                },
                getRewardsHistory: {
                    handler: this._wallet.getRewardsHistory,
                    scope: this._wallet,
                    inherits: ['pagination', 'userSpecific'],
                    validation: {
                        properties: {
                            types: {
                                type: 'array',
                                default: ['all'],
                                items: {
                                    type: 'string',
                                    enum: ['benefeciary', 'curators', 'author', 'delegator', 'all'],
                                },
                            },
                        },
                    },
                },
                getDelegationState: {
                    handler: this._wallet.getDelegationState,
                    scope: this._wallet,
                    inherits: ['userSpecific'],
                    validation: {
                        properties: {
                            direction: {
                                type: 'string',
                                default: 'all',
                                enum: ['in', 'out', 'all'],
                            },
                        },
                    },
                },
                convertVestingToToken: {
                    handler: this._wallet.convertVestingToToken,
                    scope: this._wallet,
                    validation: {
                        required: ['vesting'],
                        properties: {
                            vesting: {
                                type: 'string',
                            },
                        },
                    },
                },
                convertTokensToVesting: {
                    handler: this._wallet.convertTokensToVesting,
                    scope: this._wallet,
                    validation: {
                        required: ['tokens'],
                        properties: {
                            tokens: {
                                type: 'string',
                            },
                        },
                    },
                },
                getGenesisConv: {
                    handler: this._wallet.getGenesisConv,
                    scope: this._wallet,
                    inherits: ['userSpecific'],
                },
                getWithdrawStatus: {
                    handler: this._wallet.getWithdrawStatus,
                    scope: this._wallet,
                    inherits: ['userSpecific'],
                },
                getClaimHistory: {
                    handler: this._wallet.getClaimHistory,
                    scope: this._wallet,
                    inherits: ['pagination', 'userSpecific'],
                    validation: {
                        properties: {
                            tokens: {
                                type: 'array',
                                default: ['all'],
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },

            serverDefaults: {
                parents: {
                    pagination: {
                        validation: {
                            properties: {
                                sequenceKey: {
                                    type: ['string', 'null'],
                                },
                                limit: {
                                    type: 'number',
                                    default: 10,
                                },
                            },
                        },
                    },
                    userSpecific: {
                        validation: {
                            required: ['userId'],
                            properties: {
                                userId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    userRelativity: {
                        validation: {
                            properties: {
                                currentUserId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
