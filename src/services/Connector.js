const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const Wallet = require('../controllers/Wallet');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._wallet = new Wallet({ connector: this });
    }

    async start() {
        await super.start({
            serverRoutes: {
                getBalance: {
                    inherits: ['wallet', 'userSpecific'],
                    handler: this._wallet.getBalance,
                    validation: {
                        properties: {
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                            type: {
                                type: 'string',
                                enum: ['all', 'liquid', 'vesting'],
                                default: 'all',
                            },
                        },
                    },
                },
                getTransferHistory: {
                    inherits: ['wallet', 'userSpecific', 'pagination'],
                    handler: this._wallet.getTransferHistory,
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
                    inherits: ['wallet', 'pagination'],
                    handler: this._wallet.getTokensInfo,
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
                    inherits: ['wallet'],
                    handler: this._wallet.getVestingInfo,
                },
                getVestingHistory: {
                    inherits: ['wallet', 'userSpecific', 'pagination'],
                    handler: this._wallet.getVestingHistory,
                },
                getRewardsHistory: {
                    handler: this._wallet.getRewardsHistory,
                    inherits: ['wallet', 'pagination'],
                    validation: {
                        properties: {
                            types: {
                                type: 'array',
                                default: ['all'],
                                items: {
                                    type: 'string',
                                    enum: [
                                        'transfer',
                                        'benefeciary',
                                        'curators',
                                        'author',
                                        'delegator',
                                        'all',
                                    ],
                                },
                            },
                        },
                    },
                },
                getDelegationState: {
                    handler: this._wallet.getDelegationState,
                    inherits: ['wallet', 'userSpecific'],
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
                    inherits: ['wallet'],
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
                    inherits: ['wallet'],
                    validation: {
                        required: ['tokens'],
                        properties: {
                            tokens: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
            serverDefaults: {
                parents: {
                    wallet: {
                        scope: this._wallet,
                    },
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
                },
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
