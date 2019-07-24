const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const Wallet = require('../controllers/Wallet');
const MetricsUtils = require('../utils/MetricsUtils');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._wallet = new Wallet({ connector: this });
        this._metricUtils = new MetricsUtils({ prefix: 'wallet' });
    }

    async stop() {
        this._metricUtils.stop();
        await super.stop();
    }

    async start() {
        this._metricUtils.start();
        await super.start({
            serverRoutes: {
                getBalance: {
                    inherits: ['userSpecific', 'metrics'],
                    handler: this._wallet.getBalance,
                    scope: this._wallet,
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
                    inherits: ['userSpecific', 'pagination', 'metrics'],
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
                    inherits: ['pagination', 'metrics'],
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
                    inherits: ['metrics'],
                    handler: this._wallet.getVestingInfo,
                    scope: this._wallet,
                },
                getVestingHistory: {
                    inherits: ['userSpecific', 'pagination', 'metrics'],
                    handler: this._wallet.getVestingHistory,
                    scope: this._wallet,
                },
                getRewardsHistory: {
                    handler: this._wallet.getRewardsHistory,
                    scope: this._wallet,
                    inherits: ['pagination', 'userSpecific', 'metrics'],
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
                    inherits: ['userSpecific', 'metrics'],
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
                    inherits: ['metrics'],
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
                    inherits: ['metrics'],
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
                    inherits: ['userSpecific', 'metrics'],
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
                    metrics: {
                        before: [{ handler: this._handleMetricsIn, scope: this }],
                        after: [{ handler: this._handleMetricsOut, scope: this }],
                    },
                },
            },
        });

        await super.setDefaultResponse(null);
    }

    _handleMetricsIn(...params) {
        this._metricUtils.requestIn('all');
        //todo add method-specific metric
    }

    _handleMetricsOut(...params) {
        this._metricUtils.requestOut('all');
        //todo add method-specific metric
    }
}

module.exports = Connector;
