const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const env = require('../data/env');

const Wallet = require('../controllers/Wallet');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._wallet = new Wallet({ connector: this });
    }

    async start() {
        await super.start({
            serverRoutes: {
                filter_account_history: this._wallet.filterAccountHistory.bind(this._wallet),
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
                getTokensInfo: this._wallet.getTokensInfo.bind(this._wallet),
                getVestingInfo: this._wallet.getVestingInfo.bind(this._wallet),
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
                getDelegationState: this._wallet.getDelegationState.bind(this._wallet),
                convertVestingToToken: this._wallet.convertVestingToToken.bind(this._wallet),
                convertTokensToVesting: this._wallet.convertTokensToVesting.bind(this._wallet),
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
