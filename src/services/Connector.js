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
                getBalance: this._wallet.getBalance.bind(this._wallet),
                getHistory: this._wallet.getHistory.bind(this._wallet),
                getTokensInfo: this._wallet.getTokensInfo.bind(this._wallet),
                getVestingInfo: this._wallet.getVestingInfo.bind(this._wallet),
                getVestingBalance: this._wallet.getVestingBalance.bind(this._wallet),
                getVestingHistory: this._wallet.getVestingHistory.bind(this._wallet),
                convertVestingToToken: this._wallet.convertVestingToToken.bind(this._wallet),
                convertTokensToVesting: this._wallet.convertTokensToVesting.bind(this._wallet),
            },
            requiredClients: {
                prism: env.GLS_PRISM_CONNECT,
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
