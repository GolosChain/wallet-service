const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const Utils = require('../utils/Utils');

const TransferModel = require('../models/Transfer');
const DelegationModel = require('../models/Delegation');
const TokenModel = require('../models/Token');

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
            fields: ['sender', 'receiver', 'sequenceKey', 'limit'],
        });

        const { sender, receiver, sequenceKey, limit } = params;

        if (limit < 0) {
            throw { code: 805, message: 'Wrong arguments: limit must be positive' };
        }

        if (!sender && !receiver) {
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
        return await Utils.getBalance({ userId, currencies, type });
    }

    async getVestingInfo() {
        return await Utils.getVestingInfo();
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

    async convertVestingToToken({ vesting, type }) {
        return await Utils.convertVestingToToken({ vesting, type });
    }

    async convertTokensToVesting({ tokens }) {
        return await Utils.convertTokensToVesting({ tokens });
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
