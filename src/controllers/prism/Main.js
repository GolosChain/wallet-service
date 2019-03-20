const core = require('gls-core-service');
const Logger = core.utils.Logger;
const TransferModel = require('../../models/Transfer');
const BalanceModel = require('../../models/Balance');


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

        console.log(JSON.stringify(transaction, null, 2));
        transaction.actions.forEach(async action => {
            if (action.code === 'cyber.token' &&
                action.receiver === 'cyber.token'
            ) {
                if (action.action === 'transfer') {
                    await this._handleTransferAction(action, blockNum);
                }

                if (action.action === 'issue') {
                    await this._handleIssueAction(action, blockNum);
                }
            }
        });
    }

    async _handleTransferAction(action, blockNum) {
        const transferObject = {
            sender: action.args.from,
            receiver: action.args.to,
            quantity: action.args.quantity
        };

        const transfer = new TransferModel(transferObject);

        await transfer.save();

        Logger.info('Created transfer object: ' + JSON.stringify(transferObject, null, 2));

        await this._handleEvents({ events: action.events });
    }

    async _handleIssueAction(action, blockNum) {
        await this._handleEvents({ events: action.events });
    }

    async _handleEvents({ events }) {
        events.forEach(async event => {
            await this._handleBalanceEvent({ event });
        });
    }

    async _handleBalanceEvent({ event }) {
        // Sure given event is balance event
        if (!(event.code === 'cyber.token' && event.event === 'balance')) {
            return;
        }

        const balanceObject = await BalanceModel.findOne({ name: event.args.account });

        if (balanceObject) {
            // Check balance of tokens listed in balanceObject.balances array
            const neededSym = event.args.balance.sym;
            let isPresent = false;

            balanceObject.balances.forEach(async tokenBalance => {
                if (tokenBalance.sym === neededSym) {
                    isPresent = true;
                }
            });

            // Modify if such token is present and create new one otherwise
            if (isPresent) {
                await BalanceModel.updateOne({ _id: balanceObject._id }, { $set: { 'balances': [event.args.balance] } });
            }
            else {
                await BalanceModel.updateOne({ _id: balanceObject._id }, { $push: { 'balances': event.args.balance } });
            }

            Logger.info('Updated balance object of user ' + event.args.account + '.');
        }
        else {
            const newBalance = new BalanceModel({
                name: event.args.account,
                balances: [event.args.balance]
            });

            await newBalance.save();

            Logger.info('Created balance object of user ' + event.args.account + '.');
        }
    }
}

module.exports = Main;
