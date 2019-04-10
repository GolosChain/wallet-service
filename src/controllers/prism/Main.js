const core = require('gls-core-service');
const Logger = core.utils.Logger;
const TransferModel = require('../../models/Transfer');
const BalanceModel = require('../../models/Balance');
const TokenModel = require('../../models/Token');

class Main {
    async disperse({ transactions }) {
        for (const transaction of transactions) {
            await this._disperseTransaction(transaction);
        }
    }

    async _disperseTransaction(transaction) {
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
                switch (action.action) {
                    case 'transfer':
                        await this._handleTransferAction(action, trxData);
                        break;
                    case 'issue':
                        await this._handleEvents({ events: action.events });
                        break;
                    case 'create':
                        await this._handleEvents({ events: action.events });
                        break;
                    default:
                        break;
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

    async _handleEvents({ events }) {
        for (const event of events) {
            await this._handleBalanceEvent({ event });
            await this._handleCurrencyEvent({ event });
        }
    }

    async _handleBalanceEvent({ event }) {
        // Ensure given event is balance event
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

    async _handleCurrencyEvent({ event }) {
        // Ensure given event is currency event
        if (!(event.code === 'cyber.token' && event.event === 'currency')) {
            return;
        }
        const tokenObject = await TokenModel.findOne({ sym: event.args.supply.sym });

        const sym = event.args.supply.sym;
        const issuer = event.args.issuer;

        let supply = event.args.supply;
        delete supply.sym;

        let max_supply = event.args.max_supply;
        delete max_supply.sym;

        const newTokenInfo = {
            sym,
            issuer,
            supply,
            max_supply,
        };

        if (tokenObject) {
            await TokenModel.updateOne({ _id: tokenObject._id }, { $set: newTokenInfo });

            Logger.info(`Updated \"${sym}\" token info: ${JSON.stringify(newTokenInfo, null, 2)}`);
        } else {
            const newToken = new TokenModel(newTokenInfo);

            await newToken.save();

            Logger.info(`Created \"${sym}\" token info: ${JSON.stringify(newTokenInfo, null, 2)}`);
        }
    }
}

module.exports = Main;
