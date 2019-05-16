const core = require('gls-core-service');
const BasicConnector = core.services.Connector;

const Wallet = require('../controllers/Wallet');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._wallet = new Wallet();
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
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
