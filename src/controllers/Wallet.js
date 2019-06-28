const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const Utils = require('../utils/Utils');

const TransferModel = require('../models/Transfer');
const DelegationModel = require('../models/Delegation');
const BalanceModel = require('../models/Balance');
const TokenModel = require('../models/Token');

const VestingStat = require('../models/VestingStat');
const VestingBalance = require('../models/VestingBalance');
const VestingChange = require('../models/VestingChange');
const UserMeta = require('../models/UserMeta');

class Wallet extends BasicController {
    async getDelegationState({ userId, direction = 'all' }) {
        const filter = {};

        if (direction !== 'in') {
            filter.from = userId;
        }

        if (direction !== 'out') {
            filter.to = userId;
        }

        const delegations = await DelegationModel.find(
            { $and: [{ isActual: true }, { $or: [{ from: filter.from }, { to: filter.to }] }] },
            { _id: false, from: true, to: true, quantity: true, interestRate: true },
            { lean: true }
        );

        for (const delegation of delegations) {
            const gestsQuantity = delegation.quantity;
            const quantity = {
                GESTS: gestsQuantity,
            };

            quantity.GOLOS = await this.convertVestingToToken({ vesting: gestsQuantity });

            delegation.quantity = quantity;
        }

        return delegations;
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

        const res = { tokens: [] };

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
        const params = await Utils.extractArgumentList({
            args,
            fields: ['sender', 'receiver', 'sequenceKey', 'limit', 'type'],
        });

        const { sender, receiver, sequenceKey, limit } = params;

        if (limit < 0) {
            throw { code: 805, message: 'Wrong arguments: limit must be positive' };
        }

        if (!sender && !receiver) {
            throw { code: 805, message: 'Wrong arguments' };
        }

        let type = params.type;

        if (!type) {
            type = 'all';
        }

        if (!['transfer', 'author', 'curator', 'benefeciary', 'all'].includes(type)) {
            Logger.warn('getHistory: unknown transfer type --', type);
            throw { code: 805, message: 'Wrong arguments' };
        }

        let filter = {};

        // In case sender field is present it has to be a valid string
        if (sender) {
            this._checkNameString(sender);
            filter.sender = sender;
        }

        // In case receiver field is present it has to be a valid string
        if (receiver) {
            this._checkNameString(receiver);
            filter.receiver = receiver;
        }

        if (type !== 'all') {
            filter.type = type;
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

        const items = [];

        for (const transfer of transfers) {
            const senderName = await this._getUsername(transfer.sender);
            const receiverName = await this._getUsername(transfer.receiver);

            items.push({
                id: transfer._id,
                sender: senderName,
                receiver: receiverName,
                quantity: transfer.quantity,
                trx_id: transfer.trx_id,
                memo: transfer.memo,
                block: transfer.block,
                timestamp: transfer.timestamp,
                type: transfer.type,
                contentType: transfer.contentType,
                contentId: {
                    author: transfer.author,
                    permlink: transfer.permlink,
                },
            });
        }

        let newSequenceKey;

        if (items.length < limit) {
            newSequenceKey = null;
        } else {
            newSequenceKey = items[items.length - 1].id;
        }

        return { items, sequenceKey: newSequenceKey };
    }

    async filterAccountHistory(args) {
        const params = await Utils.extractArgumentList({
            args,
            fields: ['account', 'from', 'limit', 'query'],
        });

        const { account, from, limit, query } = params;

        if (limit < 0) {
            throw { code: 805, message: 'Wrong arguments: limit must be positive' };
        }

        if (from > 0 && limit > from) {
            throw { code: 805, message: `Wrong arguments: limit can't be greater than from` };
        }

        let transfers;
        let filter;

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

        let beginId, endId;

        if (from === -1) {
            const cmpVal = transfers.length - 1 - limit;
            beginId = cmpVal >= 0 ? cmpVal : 0;
            endId = transfers.length;
        } else {
            beginId = from - limit;
            endId = Math.min(from + 1, transfers.length);
        }

        const result = [];

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
                            amount: Utils.formatQuantity(transfer.quantity),
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

    async getBalance({ userId, currencies, type }) {
        const balanceObject = await BalanceModel.findOne({ name: userId });

        if (!balanceObject) {
            return {};
        }

        let res = {
            userId,
        };

        let tokensMap = {};

        if (type !== 'liquid') {
            const {
                vesting: total,
                delegated: outDelegate,
                received: inDelegated,
            } = await this._getVestingBalance({ account: userId });

            res.vesting = { total, outDelegate, inDelegated };
        }

        if (type !== 'vesting') {
            res.liquid = {};
            if (currencies.includes('all')) {
                const allCurrencies = await TokenModel.find({});
                for (const currency of allCurrencies) {
                    tokensMap[currency.sym] = true;
                }
            } else
                for (const token of currencies) {
                    tokensMap[token] = true;
                }
            for (const tokenBalance of balanceObject.balances) {
                const { sym, quantityRaw } = await Utils.parseAsset(tokenBalance);
                if (tokensMap[sym]) {
                    res.liquid[sym] = quantityRaw;
                }
            }
        }

        return res;
    }

    async getVestingInfo() {
        const vestingStat = await VestingStat.findOne();

        if (!vestingStat) {
            return {};
        }

        return { stat: vestingStat.stat };
    }

    async _getVestingBalance({ account }) {
        const vestingBalance = await VestingBalance.findOne({ account });

        if (!vestingBalance) {
            return {};
        }

        vestingBalance.vesting = Utils.parseAsset(vestingBalance.vesting);
        vestingBalance.delegated = Utils.parseAsset(vestingBalance.delegated);
        vestingBalance.received = Utils.parseAsset(vestingBalance.received);

        const { quantityRaw: vestingInGolos } = await this.convertVestingToToken({
            vesting: vestingBalance.vesting,
            type: 'parsed',
        });
        const { quantityRaw: delegatedInGolos } = await this.convertVestingToToken({
            vesting: vestingBalance.delegated,
            type: 'parsed',
        });
        const { quantityRaw: receivedInGolos } = await this.convertVestingToToken({
            vesting: vestingBalance.received,
            type: 'parsed',
        });

        return {
            account,
            vesting: { GESTS: vestingBalance.vesting, GOLOS: vestingInGolos },
            delegated: { GESTS: vestingBalance.delegated, GOLOS: delegatedInGolos },
            received: { GESTS: vestingBalance.received, GOLOS: receivedInGolos },
        };
    }

    async getVestingHistory(args) {
        const params = await Utils.extractArgumentList({
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

        const items = [];

        for (const change of vestingChanges) {
            const diffInGolos = await this.convertVestingToToken({
                vesting: change.diff,
            });

            items.push({
                id: change._id,
                who: change.who,
                diff: {
                    GESTS: change.diff,
                    GOLOS: diffInGolos,
                },
                block: change.block,
                trx_id: change.trx_id,
                timestamp: change.timestamp,
            });
        }

        let newSequenceKey;

        if (items.length < limit) {
            newSequenceKey = null;
        } else {
            newSequenceKey = items[items.length - 1].id;
        }

        return { items, sequenceKey: newSequenceKey };
    }

    async _getVestingSupplyAndBalance() {
        const vestingStat = await this.getVestingInfo();
        const vestingBalance = await this.getBalance({
            userId: 'gls.vesting',
            currencies: ['GOLOS'],
            type: 'liquid',
        });

        await Utils.checkVestingStatAndBalance({
            vestingBalance,
            vestingStat: vestingStat.stat,
        });

        const balance = await Utils.checkAsset(vestingBalance.liquid.GOLOS);
        const supply = await Utils.checkAsset(vestingStat.stat);

        return {
            balance: balance.amount,
            supply: supply.amount,
        };
    }

    async convertVestingToToken(args) {
        const params = await Utils.extractArgumentList({
            args,
            fields: ['vesting', 'type'],
        });
        if (!params.type) {
            params.type = 'string';
        }
        const { vesting, type } = params;
        const { decs, amount } = await Utils.checkAsset(vesting);

        await Utils.checkDecsValue({ decs, requiredValue: 6 });

        const { balance, supply } = await this._getVestingSupplyAndBalance();
        const resultString = Utils.convertAssetToString({
            sym: 'GOLOS',
            amount: Math.round((amount * balance) / supply),
            decs: 3,
        });

        if (type === 'string') {
            return resultString;
        }
        return Utils.parseAsset(resultString);
    }

    async convertTokensToVesting(args) {
        const params = await Utils.extractArgumentList({
            args,
            fields: ['tokens'],
        });
        const { tokens } = params;
        const { decs, amount } = await Utils.checkAsset(tokens);

        await Utils.checkDecsValue({ decs, requiredValue: 3 });

        const { balance, supply } = await this._getVestingSupplyAndBalance();

        return Utils.convertAssetToString({
            sym: 'GOLOS',
            amount: Math.round((amount * supply) / balance),
            decs: 6,
        });
    }

    _checkNameString(name) {
        if (typeof name !== 'string') {
            throw { code: 809, message: 'Name must be a non-empty string!' };
        }
    }

    async _getUsername(account) {
        const accountMeta = await UserMeta.findOne({ userId: account });

        if (accountMeta) {
            return accountMeta.username;
        }

        return account;
    }
}

module.exports = Wallet;
