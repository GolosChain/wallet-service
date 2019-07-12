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
                    handler: this._wallet.getBalance,
                    scope: this._wallet,
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
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
                        },
                    },
                },
                getTransferHistory: {
                    handler: this._wallet.getTransferHistory,
                    scope: this._wallet,
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                            direction: {
                                type: 'string',
                                enum: ['in', 'out', 'all'],
                                default: 'all',
                            },
                            sequenceKey: {
                                type: 'string',
                            },
                            limit: {
                                type: 'number',
                                default: 10,
                            },
                        },
                    },
                },
                getTokensInfo: {
                    handler: this._wallet.getTokensInfo,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                            sequenceKey: {
                                type: 'string',
                            },
                            limit: {
                                type: 'number',
                                default: 10,
                            },
                        },
                    },
                },
                getVestingInfo: {
                    handler: this._wallet.getVestingInfo,
                    scope: this._wallet,
                },
                getVestingHistory: {
                    handler: this._wallet.getVestingHistory,
                    scope: this._wallet,
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            sequenceKey: {
                                type: 'string',
                            },
                            limit: {
                                type: 'number',
                                default: 10,
                            },
                        },
                    },
                },
                getRewardsHistory: {
                    handler: this._wallet.getRewardsHistory,
                    scope: this._wallet,
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
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
                            sequenceKey: {
                                type: 'string',
                            },
                            limit: {
                                type: 'number',
                                default: 10,
                            },
                        },
                    },
                },
                getDelegationState: {
                    handler: this._wallet.getDelegationState,
                    scope: this._wallet,
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
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
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
