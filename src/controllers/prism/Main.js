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

        const trxData = {
            trx_id: transaction.id,
            block: transaction.block_num,
            timestamp: transaction.block_time,
        };

        for (const action of transaction.actions) {
            if (action.code === 'cyber.token' && action.receiver === 'cyber.token') {
                if (action.action === 'transfer') {
                    await this._handleTransferAction(action, trxData);
                }

                if (action.action === 'issue') {
                    await this._handleIssueAction(action, trxData);
                }
            }
        }
    }

    async _handleTransferAction(action, trxData) {
        if (!action.args) {
            throw { code: 812, message: 'Invalid action object' };
        }

        const transferObject = {
            ...trxData,
            sender: action.args.from,
            receiver: action.args.to,
            quantity: action.args.quantity,
        };

        const transfer = new TransferModel(transferObject);

        await transfer.save();

        Logger.info('Created transfer object: ' + JSON.stringify(transferObject, null, 2));

        await this._handleEvents({ events: action.events });
    }

    async _handleIssueAction(action, blockNum) {
        await this._handleEvents(action);
    }

    async _handleEvents({ events }) {
        for (const event of events) {
            await this._handleBalanceEvent({ event });
        }
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
            let neededTokenId = null;

            for (let i = 0; i < balanceObject.balances.length; i++) {
                if (balanceObject.balances[i].sym === neededSym) {
                    neededTokenId = i;
                }
            }

            // Modify if such token is present and create new one otherwise
            if (neededTokenId != null) {
                let objectToModify = {};
                const idString = 'balances.' + neededTokenId;
                objectToModify[idString] = event.args.balance;

                await BalanceModel.updateOne({ _id: balanceObject._id }, { $set: objectToModify });
            } else {
                await BalanceModel.updateOne(
                    { _id: balanceObject._id },
                    { $push: { balances: event.args.balance } }
                );
            }

            Logger.info(
                `Updated balance object of user ${event.args.account}: ${JSON.stringify(
                    event.args.balance,
                    null,
                    2
                )}`
            );
        } else {
            const newBalance = new BalanceModel({
                name: event.args.account,
                balances: [event.args.balance],
            });

            await newBalance.save();

            Logger.info(
                `Created balance object of user ${event.args.account}: ${JSON.stringify(
                    event.args.balance,
                    null,
                    2
                )}`
            );
        }
    }
}

module.exports = Main;
