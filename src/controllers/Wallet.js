const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Utils = require('../utils/Utils');

const TransferModel = require('../models/Transfer');
const DelegationModel = require('../models/Delegation');
const TokenModel = require('../models/Token');
const RewardModel = require('../models/Reward');
const GenesisConvModel = require('../models/GenesisConv');
const Withdrawal = require('../models/Withdrawal');

const VestingChange = require('../models/VestingChange');

class Wallet extends BasicController {
    async getGenesisConv({ userId }) {
        const filter = { userId };

        return await GenesisConvModel.find(
            filter,
            { _id: false, __v: false, createdAt: false, updatedAt: false },
            { lean: true }
        );
    }

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
        const directionFilter = [];
        const currenciesFilter = [];

        if (direction !== 'in') {
            directionFilter.push({ sender: userId });
        }

        if (direction !== 'out') {
            directionFilter.push({ receiver: userId });
        }

        if (!currencies.includes('all')) {
            for (const sym of currencies) {
                currenciesFilter.push({ sym });
            }
        }

        const filter = {
            $and: [{ $or: [...directionFilter] }],
        };

        if (currenciesFilter.length > 0) {
            filter.$and.push({ $or: [...currenciesFilter] });
        }

        if (sequenceKey) {
            filter._id = { $lt: sequenceKey };
        }

        const pipeline = [
            {
                $match: filter,
            },
            {
                $sort: {
                    _id: -1,
                },
            },
            {
                $limit: limit,
            },
            {
                $lookup: {
                    from: 'usermetas',
                    localField: 'sender',
                    foreignField: 'userId',
                    as: 'senderMeta',
                },
            },
            {
                $lookup: {
                    from: 'usermetas',
                    localField: 'receiver',
                    foreignField: 'userId',
                    as: 'receiverMeta',
                },
            },
        ];

        const transfers = await TransferModel.aggregate(pipeline);

        const items = [];

        for (const transfer of transfers) {
            const receiverName = {
                userId: transfer.receiver,
            };
            const senderName = {
                userId: transfer.sender,
            };

            if (transfer.receiverMeta[0]) {
                receiverName.username = transfer.receiverMeta[0].username;
                receiverName.name = transfer.receiverMeta[0].name;
            }

            if (transfer.senderMeta[0]) {
                senderName.username = transfer.senderMeta[0].username;
                senderName.name = transfer.senderMeta[0].name;
            }

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
            if (types.length > 1) {
                filter.$or = types.map(type => {
                    return { type };
                });
            } else {
                filter.type = types[0];
            }
        }

        if (sequenceKey) {
            filter._id = { $lt: sequenceKey };
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
            filter._id = { $lt: sequenceKey };
        }

        const vestingChanges = await VestingChange.find(filter, {}, { lean: true })
            .limit(limit)
            .sort({ _id: -1 });

        const items = [];

        for (const change of vestingChanges) {
            // todo: do this in dispersion section

            const { quantityRaw } = await Utils.convertVestingToToken({
                vesting: change.diff,
            });

            const { quantityRaw: getstsRaw } = await Utils.parseAsset(change.diff);

            items.push({
                id: change._id,
                who: change.who,
                diff: {
                    GESTS: getstsRaw,
                    GOLOS: quantityRaw,
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

    async getWithdrawStatus({ userId }) {
        const withdrawObject = await Withdrawal.findOne({ owner: userId });

        if (withdrawObject) {
            return {
                userId,
                remainingPayments: withdrawObject.remaining_payments,
                nextPayout: withdrawObject.next_payout,
                toWithdraw: withdrawObject.to_withdraw,
            };
        } else {
            return {};
        }
    }
}

module.exports = Wallet;
