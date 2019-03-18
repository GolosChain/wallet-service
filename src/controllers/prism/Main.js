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
            if (action.code     === 'cyber.token'   &&
                action.receiver === 'cyber.token'   &&
                action.action   === 'transfer'
            ) {
                await this._disperseTransferAction(action, blockNum);
            }
        });
    }

    async _disperseTransferAction(action, blockNum) {
        const transfer = new TransferModel({
            sender: action.args.from,
            receiver: action.args.to,
            quantity: action.args.quantity
        });

        await transfer.save();

        action.events.forEach(async event => {
            const bModel = await BalanceModel.findOne({ name: event.args.account });

            if (bModel) {
                // Check balance of tokens listed in bModel.balance array
                const neededSym = event.args.balance.sym;
                let isPresent = false;

                bModel.balances.forEach(async tokenBalance => {
                    if (tokenBalance.sym === neededSym) {
                        isPresent = true;
                    }
                });
                
                // Modify if such token is present and create new one otherwise 
                if (isPresent) {
                    await BalanceModel.updateOne({ _id: bModel._id }, { $set: { 'balances': [event.args.balance] } });
                }
                else {
                    await BalanceModel.updateOne({ _id: bModel._id }, { $push: { 'balances': event.args.balance } });
                }
            }
            else {
                const newBalance = new BalanceModel({
                    name: event.args.account,
                    balances: [event.args.balance]
                });

                await newBalance.save();
            }
        });
    }
}

module.exports = Main;
