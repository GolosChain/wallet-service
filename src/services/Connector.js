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
                is_locked: this._wallet.isLocked.bind(this._wallet)
            },
        });
    }
}

module.exports = Connector;
