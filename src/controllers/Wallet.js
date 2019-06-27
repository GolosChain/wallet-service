const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const ParamsUtils = require('../utils/ParamsUtils');

const TransferModel = require('../models/Transfer');
const DelegationModel = require('../models/Delegation');
const BalanceModel = require('../models/Balance');
const TokenModel = require('../models/Token');

const VestingStat = require('../models/VestingStat');
const VestingBalance = require('../models/VestingBalance');
const VestingChange = require('../models/VestingChange');
const UserMeta = require('../models/UserMeta');

class Wallet extends BasicController {
    constructor(...args) {
        super(...args);
        this._paramsUtils = new ParamsUtils();
    }

    async getDelegationState({ userId, direction = 'all' }) {
        const filter = {};

        if (direction === 'in') {
            filter.to = userId;
        }

        if (direction === 'out') {
            filter.from = userId;
        }

        const delegations = await DelegationModel.find(
            { isActual: true, ...filter },
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
        const params = await this._paramsUtils.extractArgumentList({
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
        const params = await this._paramsUtils.extractArgumentList({
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
                            amount: this._formatQuantity(transfer.quantity),
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
        if (!name || typeof name !== 'string') {
            throw { code: 809, message: 'getBalance: name must be non-empty string' };
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
        const vestingStat = await VestingStat.findOne();

        if (!vestingStat) {
            return {};
        }

        return { stat: vestingStat.stat };
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

        const vestingBalance = await VestingBalance.findOne({ account });

        if (!vestingBalance) {
            return {};
        }

        const vestingInGolos = await this.convertVestingToToken({
            vesting: vestingBalance.vesting,
        });
        const delegatedInGolos = await this.convertVestingToToken({
            vesting: vestingBalance.delegated,
        });
        const receivedInGolos = await this.convertVestingToToken({
            vesting: vestingBalance.received,
        });

        return {
            account,
            vesting: { GESTS: vestingBalance.vesting, GOLOS: vestingInGolos },
            delegated: { GESTS: vestingBalance.delegated, GOLOS: delegatedInGolos },
            received: { GESTS: vestingBalance.received, GOLOS: receivedInGolos },
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

        return this._paramsUtils.convertAssetToString({
            sym: 'GOLOS',
            amount: Math.round((amount * balance) / supply),
            decs: 3,
        });
    }

    async convertTokensToVesting(args) {
        const params = await this._paramsUtils.extractArgumentList({
            args,
            fields: ['tokens'],
        });
        const { tokens } = params;
        const { decs, amount } = await this._paramsUtils.checkAsset(tokens);

        await this._paramsUtils.checkDecsValue({ decs, requiredValue: 3 });

        const { balance, supply } = await this._getVestingSupplyAndBalance();

        return this._paramsUtils.convertAssetToString({
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

    // Converts transfers quantity data to asset string
    // Like: "123.000 GLS"
    _formatQuantity(quantity) {
        return (
            new BigNum(quantity.amount).shiftedBy(-quantity.decs).toString() + ' ' + quantity.sym
        );
    }
}

module.exports = Wallet;
