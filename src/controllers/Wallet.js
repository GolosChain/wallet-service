const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Utils = require('../utils/Utils');

const TransferModel = require('../models/Transfer');
const DelegationModel = require('../models/Delegation');
const TokenModel = require('../models/Token');
const RewardModel = require('../models/Reward');

const VestingChange = require('../models/VestingChange');
const UserMeta = require('../models/UserMeta');

class Wallet extends BasicController {
    async getDelegationState({ userId, direction }) {
        const filter = {
            $and: [
                {
                    isActual: true,
                },
            ],
        };

        const orFilter = [];

        if (direction !== 'in') {
            orFilter.push({ from: userId });
        }

        if (direction !== 'out') {
            orFilter.push({ to: userId });
        }

        filter.$and.push({
            $or: orFilter,
        });

        const delegations = await DelegationModel.find(
            filter,
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

    async getTokensInfo({ currencies, limit, sequenceKey }) {
        const filter = {};

        if (!currencies.includes('all')) {
            filter.$or = currencies.map(currency => ({
                sym: currency,
            }));
        }

        if (sequenceKey) {
            filter._id = {
                $gt: sequenceKey,
            };
        }

        const tokensList = await TokenModel.find(filter, {}, { lean: true }).limit(limit);

        let newSequenceKey;

        if (tokensList.length < limit) {
            newSequenceKey = null;
        } else {
            newSequenceKey = tokensList[tokensList.length - 1]._id;
        }

        return {
            tokens: tokensList.map(tokenObject => ({
                id: tokenObject._id,
                sym: tokenObject.sym,
                issuer: tokenObject.issuer,
                supply: tokenObject.supply,
                maxSupply: tokenObject.max_supply,
            })),
            newSequenceKey,
        };
    }

    async getTransferHistory({ userId, direction, currencies, sequenceKey, limit }) {
        const directionFilter = { $or: [] };
        const currenciesFilter = {};

        if (direction !== 'in') {
            directionFilter.$or.push({ sender: userId });
        }

        if (direction !== 'out') {
            directionFilter.$or.push({ receiver: userId });
        }

        if (!currencies.includes('all')) {
            currenciesFilter.$or = [];
            for (const sym of currencies) {
                currenciesFilter.$or.push({ sym });
            }
        }

        const filter = {
            ...directionFilter,
            ...currenciesFilter,
        };

        if (sequenceKey) {
            filter._id = { $gt: sequenceKey };
        }

        const transfers = await TransferModel.find(
            {
                ...filter,
            },
            {},
            { lean: true }
        )
            .limit(limit)
            .sort({ _id: -1 });

        const items = [];

        for (const transfer of transfers) {
            // todo: add username field in model and resolve user names when dispersing blocks

            const senderName = await this._getUsername(transfer.sender);
            const receiverName = await this._getUsername(transfer.receiver);

            items.push({
                id: transfer._id,
                sender: senderName,
                receiver: receiverName,
                quantity: transfer.quantity,
                sym: transfer.sym,
                trxId: transfer.trx_id,
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

    async getBalance({ userId, currencies, type }) {
        return await Utils.getBalance({ userId, currencies, type });
    }

    async getVestingInfo() {
        return await Utils.getVestingInfo();
    }

    async getRewardsHistory({ userId, types, sequenceKey, limit }) {
        const filter = { userId };

        if (!types.includes('all')) {
            filter.$or = types.map(type => {
                return { type };
            });
        }

        if (sequenceKey) {
            filter._id = { $gt: sequenceKey };
        }

        const rewards = await RewardModel.find(filter, {}, { lean: true })
            .limit(limit)
            .sort({ _id: -1 });

        let newSequenceKey;

        if (rewards.length < limit) {
            newSequenceKey = null;
        } else {
            newSequenceKey = rewards[rewards.length - 1]._id;
        }

        return {
            sequenceKey: newSequenceKey,
            items: rewards.map(reward => ({
                id: reward._id,
                userId: reward.userId,
                block: reward.block,
                trxId: reward.trx_id,
                timestamp: reward.timestamp,
                tokenType: reward.tokenType,
                sym: reward.sym,
                type: reward.type,
                contentType: reward.contentType,
                contentId: reward.contentId,
                quantity: reward.quantity,
            })),
        };
    }

    async getVestingHistory({ userId, sequenceKey, limit }) {
        const filter = {
            who: userId,
        };

        if (sequenceKey) {
            filter._id = { $gt: sequenceKey };
        }

        const vestingChanges = await VestingChange.find(filter, {}, { lean: true })
            .limit(limit)
            .sort({ _id: -1 });

        const items = [];

        for (const change of vestingChanges) {
            // todo: do this in dispersion section

            const { quantityRaw, sym } = await Utils.convertVestingToToken({
                vesting: change.diff,
            });

            items.push({
                id: change._id,
                who: change.who,
                diff: {
                    GESTS: change.diff,
                    GOLOS: `${quantityRaw} ${sym}`,
                },
                block: change.block,
                trxId: change.trx_id,
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

    async convertVestingToToken({ vesting }) {
        return await Utils.convertVestingToToken({ vesting, type: 'string' });
    }

    async convertTokensToVesting({ tokens }) {
        return await Utils.convertTokensToVesting({ tokens });
    }

    async _getUsername(account) {
        const accountMeta = await UserMeta.findOne({ userId: account });
        const result = {
            userId: account,
        };

        if (accountMeta) {
            result.username = accountMeta.username;
        }

        return result;
    }
}

module.exports = Wallet;
