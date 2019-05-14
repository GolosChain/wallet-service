const BalanceModel = require('../models/Balance');
const BulkSaver = require('./BulkSaver');

class BalanceAggregator {
    constructor() {
        this._currentAccount = null;
        this._currentAccountBalances = null;

        this._balanceBulkSaver = new BulkSaver(BalanceModel);
    }

    add(data) {
        const { account, balance } = data;

        if (account !== this._currentAccount) {
            if (this._currentAccount) {
                this._saveCurrent();
            }

            this._currentAccount = account;
            this._currentAccountBalances = [];
        }

        this._currentAccountBalances.push({
            sym: balance.sym,
            decs: balance.decs,
            amount: safeNumber(balance.amount),
        });
    }

    async finish() {
        if (this._currentAccount) {
            this._saveCurrent();
        }

        await this._balanceBulkSaver.finish();
    }

    _saveCurrent() {
        this._balanceBulkSaver.addEntry({
            name: this._currentAccount,
            balances: this._currentAccountBalances,
        });

        this._currentAccount = null;
        this._currentAccountBalances = null;
    }
}

module.exports = BalanceAggregator;
