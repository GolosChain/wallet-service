const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Main {
    async disperse({ transactions, blockNum }) {
        for (const transaction of transactions) {
            await this._disperseTransaction(transaction, blockNum);
        }
    }

    async _disperseTransaction(transaction, blockNum) {
        if (!transaction) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        console.log(transaction);

        if (transaction.code !== 'cyber.token' && transaction.action !== 'transfer') {
            return;
        }

        // Add logic
    }
}

module.exports = Main;
