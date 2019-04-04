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
                unlock: this._wallet.unlock.bind(this._wallet),
                lock: this._wallet.lock.bind(this._wallet),
                set_password: this._wallet.setPassword.bind(this._wallet),
                import_key: this._wallet.importKey.bind(this._wallet),
                transfer: this._wallet.transfer.bind(this._wallet),
                is_locked: this._wallet.isLocked.bind(this._wallet),
                filter_account_history: this._wallet.filterAccountHistory.bind(this._wallet),
                getBalance: this._wallet.getBalance.bind(this._wallet),
                getHistory: this._wallet.getHistory.bind(this._wallet),
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
