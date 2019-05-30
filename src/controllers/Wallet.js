const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const ParamsUtils = require('../utils/ParamsUtils');

const TransferModel = require('../models/Transfer');
const BalanceModel = require('../models/Balance');
const TokenModel = require('../models/Token');

const VestingStat = require('../models/VestingStat');
const VestingBalance = require('../models/VestingBalance');
const VestingChange = require('../models/VestingChange');

class Wallet extends BasicController {
    constructor(...args) {
        super(...args);
        this._paramsUtils = new ParamsUtils();
    }

    async getTokensInfo(args) {
        let params;

        if (Array.isArray(args) && args.length !== 0) {
            params = args;
        } else {
            if (typeof args === 'object') {
                params = args.tokens;
            } else {
                Logger.warn(`getTokensInfo: invalid argument ${args}`);
                throw { code: 805, message: 'Wrong arguments' };
            }
        }

        let res = { tokens: [] };

        for (const token of params) {
            if (typeof token !== 'string') {
                Logger.warn(`getTokensInfo: invalid argument ${params}: ${token}`);
                throw { code: 805, message: 'Wrong arguments' };
            }

            const tokenObject = await TokenModel.findOne({ sym: token });

            if (tokenObject) {
                const tokenInfo = {
                    sym: tokenObject.sym,
                    issuer: tokenObject.issuer,
                    supply: tokenObject.supply,
                    max_supply: tokenObject.max_supply,
                };

                res.tokens.push(tokenInfo);
            }
        }

        return res;
    }

    async getHistory(args) {
        const params = await this._paramsUtils.extractArgumentList({
            args,
            fields: ['sender', 'receiver', 'sequenceKey', 'limit'],
        });

        const { sender, receiver, sequenceKey, limit } = params;

        if (limit < 0) {
            Logger.warn('getVestingHistory: invalid argument: limit must be positive');
            throw { code: 805, message: 'Wrong arguments: limit must be positive' };
        }

        if (!sender && !receiver) {
            Logger.warn('getHistory: at least one of sender and receiver must be non-empty');
            throw { code: 805, message: 'Wrong arguments' };
        }

        let filter = {};

        const checkNameString = name => {
            if (typeof name !== 'string') {
                throw { code: 809, message: 'Name must be a non-empty string!' };
            }
        };

        // In case sender field is present it has to be a valid string
        if (sender) {
            checkNameString(sender);
            filter.sender = sender;
        }

        // In case receiver field is present it has to be a valid string
        if (receiver) {
            checkNameString(receiver);
            filter.receiver = receiver;
        }

        let transfers;

        if (sequenceKey) {
            transfers = await TransferModel.find({
                ...filter,
                _id: { $gt: ObjectId(sequenceKey) },
            })
                .limit(limit)
                .sort({ _id: -1 });
        } else {
            transfers = await TransferModel.find(filter)
                .limit(limit)
                .sort({ _id: -1 });
        }

        const getUsername = async account => {
            const data = {
                app: 'cyber',
                userId: account,
            };

            try {
                const accountMeta = await this.callService('prism', 'getNotifyMeta', data);
                return accountMeta.user.username;
            } catch (error) {
                Logger.error(
                    `Error calling prism.getNotifyMeta in ${
                        this.constructor.name
                    } with data:\n${JSON.stringify(data, null, 2)}\n`,
                    JSON.stringify(error, null, 2)
                );
                return account;
            }
        };
        console.log(1);
        const items = [];

        for (const transfer of transfers) {
            // const senderName = await getUsername(transfer.sender);
            // const receiverName = await getUsername(transfer.receiver);

            items.push({
                id: transfer._id,
                // sender: senderName,
                // receiver: receiverName,
                quantity: transfer.quantity,
                trx_id: transfer.trx_id,
                block: transfer.block,
                timestamp: transfer.timestamp,
            });
        }
        console.log(2);

        let newSequenceKey;
        let itemsCount;

        if (items.length > 0) {
            newSequenceKey = items[items.length - 1].id;
            itemsCount = items.length;
        } else {
            newSequenceKey = null;
            itemsCount = null;
        }

        if (itemsCount < limit) {
            newSequenceKey = null;
        }

        console.log(2);

        if (itemsCount === limit) {
            console.log({ newSequenceKey });
            const nextOne = await TransferModel.find({
                ...filter,
                _id: { $gt: newSequenceKey },
            })
                .limit(1)
                .sort({ _id: -1 });

            console.log(3);
            console.log(nextOne);
            if (nextOne === null) {
                newSequenceKey = null;
            }
        }

        return { items, itemsCount, sequenceKey: newSequenceKey };
    }

    async filterAccountHistory(args) {
        const params = await this._paramsUtils.extractArgumentList({
            args,
            fields: ['account', 'from', 'limit', 'query'],
        });

        const { account, from, limit, query } = params;

        if (limit < 0) {
            Logger.warn('filter_account_history: invalid argument: limit must be positive');
            throw { code: 805, message: 'Wrong arguments: limit must be positive' };
        }

        if (from > 0 && limit > from) {
            Logger.warn(
                'filter_account_history: invalid argument: limit can not be greater that from'
            );
            throw { code: 805, message: 'Wrong arguments: limit can not be greater that from' };
        }

        let transfers;
        let filter;
        let ghres;

        switch (query.direction) {
            case 'sender':
                filter = {
                    sender: account,
                };

                transfers = await TransferModel.find(filter);
                break;

            case 'receiver':
                filter = {
                    receiver: account,
                };

                transfers = await TransferModel.find(filter);
                break;

            case 'dual':
                filter = {
                    sender: account,
                    receiver: account,
                };

                transfers = await TransferModel.find(filter);
                break;

            default:
                const searchResult = await TransferModel.find({
                    $or: [{ sender: account }, { receiver: account }],
                });

                transfers = searchResult;
                break;
        }

        let result = [];
        let beginId, endId;

        if (from === -1) {
            const cmpVal = transfers.length - 1 - limit;
            beginId = cmpVal >= 0 ? cmpVal : 0;
            endId = transfers.length;
        } else {
            beginId = from - limit;
            endId = Math.min(from + 1, transfers.length);
        }

        // Converts transfers quantity data to asset string
        // Like: "123.000 GLS"
        const formatQuantity = quantity => {
            return (
                new BigNum(quantity.amount).shiftedBy(-quantity.decs).toString() +
                ' ' +
                quantity.sym
            );
        };

        for (let i = beginId; i < endId; i++) {
            const transfer = transfers[i];
            result.push([
                i,
                {
                    op: [
                        'transfer',
                        {
                            from: transfer.sender,
                            to: transfer.receiver,
                            amount: formatQuantity(transfer.quantity),
                            memo: '{}',
                        },
                    ],
                    trx_id: transfer.trx_id,
                    block: transfer.block,
                    timestamp: transfer.timestamp,
                },
            ]);
        }

        return result;
    }

    async getBalance({ name, tokensList }) {
        if (!name || !(typeof name === 'string')) {
            throw { code: 809, message: 'getBalance: name must be a string!' };
        }

        if (name.length === 0) {
            throw { code: 810, message: 'getBalance: name can not be empty string!' };
        }

        const balanceObject = await BalanceModel.findOne({ name });

        if (!balanceObject) {
            return {};
        }

        let res = {
            name,
            balances: [],
        };

        let tokensMap = {};

        if (tokensList) {
            if (!Array.isArray(tokensList)) {
                Logger.warn('getBalance: invalid argument: tokens param must be array of strings');
                throw {
                    code: 805,
                    message: 'getBalance: invalid argument: tokens param must be array of strings',
                };
            }

            for (const token of tokensList) {
                if (typeof token !== 'string') {
                    throw {
                        code: 809,
                        message: 'getBalance: any tokensList element must be a string!',
                    };
                }
                tokensMap[token] = true;
            }
        }

        for (const tokenBalance of balanceObject.balances) {
            if (tokensList) {
                const sym = await this._paramsUtils.getAssetName(tokenBalance);
                if (tokensMap[sym]) {
                    res.balances.push(tokenBalance);
                }
            } else {
                res.balances.push(tokenBalance);
            }
        }

        return res;
    }

    async getVestingInfo() {
        const vestingStat = await VestingStat.find();

        if (!vestingStat) {
            return {};
        }

        return { stat: vestingStat[0].stat };
    }

    async getVestingBalance({ account }) {
        if (!account || typeof account !== 'string') {
            throw { code: 809, message: 'getVestingBalance: account name must be a string!' };
        }

        if (account.length === 0) {
            throw {
                code: 810,
                message: 'getVestingBalance: account name can not be empty string!',
            };
        }
        this._checkAsset();
        const vestingBalance = await VestingBalance.findOne({ account });

        if (!vestingBalance) {
            return {};
        }

        return {
            account,
            vesting: vestingBalance.vesting,
            delegated: vestingBalance.delegated,
            received: vestingBalance.received,
        };
    }

    async getVestingHistory(args) {
        const params = await this._paramsUtils.extractArgumentList({
            args,
            fields: ['account', 'sequenceKey', 'limit'],
        });

        const { account, sequenceKey, limit } = params;

        if (limit < 0) {
            Logger.warn('getVestingHistory: invalid argument: limit must be positive');
            throw { code: 805, message: 'Wrong arguments: limit must be positive' };
        }

        let vestingChanges;

        if (sequenceKey) {
            vestingChanges = await VestingChange.find({
                who: account,
                _id: { $gt: sequenceKey },
            })
                .limit(limit)
                .sort({ _id: -1 });
        } else {
            vestingChanges = await VestingChange.find({ who: account })
                .limit(limit)
                .sort({ _id: -1 });
        }

        const items = vestingChanges.map(v => ({
            id: v._id,
            who: v.who,
            diff: v.diff,
            block: v.block,
            trx_id: v.trx_id,
            timestamp: v.timestamp,
        }));

        let newSequenceKey;
        let itemsCount;

        if (items.length > 0) {
            newSequenceKey = items[items.length - 1].id;
            itemsCount = items.length;
        } else {
            newSequenceKey = null;
            itemsCount = null;
        }

        return { items, itemsCount, sequenceKey: newSequenceKey };
    }

    async _getVestingSupplyAndBalance() {
        const vestingStat = await this.getVestingInfo();
        const vestingBalance = await this.getBalance({
            name: 'gls.vesting',
            tokensList: ['GOLOS'],
        });

        await this._paramsUtils.checkVestingStatAndBalance({
            vestingBalance,
            vestingStat: vestingStat.stat,
        });

        const balance = await this._paramsUtils.checkAsset(vestingBalance.balances[0]);
        const supply = await this._paramsUtils.checkAsset(vestingStat.stat);

        return {
            balance: balance.amount,
            supply: supply.amount,
        };
    }

    async convertVestingToToken(args) {
        const params = await this._paramsUtils.extractArgumentList({
            args,
            fields: ['vesting'],
        });
        const { vesting } = params;
        const { decs, amount } = await this._paramsUtils.checkAsset(vesting);

        await this._paramsUtils.checkDecsValue({ decs, requiredValue: 6 });

        const { balance, supply } = await this._getVestingSupplyAndBalance();

        return {
            sym: 'GOLOS',
            amount: Math.round((amount * balance) / supply),
            decs: 3,
        };
    }

    async convertTokensToVesting(args) {
        const params = await this._paramsUtils.extractArgumentList({
            args,
            fields: ['tokens'],
        });
        let { tokens } = params;
        const { decs, amount } = await this._paramsUtils.checkAsset(tokens);

        await this._paramsUtils.checkDecsValue({ decs, requiredValue: 3 });

        const { balance, supply } = await this._getVestingSupplyAndBalance();

        return {
            sym: 'GOLOS',
            amount: Math.round((amount * supply) / balance),
            decs: 6,
        };
    }
}

module.exports = Wallet;
