const core = require('gls-core-service');
const { Logger, metrics, BulkSaver } = core.utils;
const UserMetaModel = require('../../models/UserMeta');
const BalanceModel = require('../../models/Balance');
const VestingBalanceModel = require('../../models/VestingBalance');
const TokenModel = require('../../models/Token');
const TransferModel = require('../../models/Transfer');
const DelegationModel = require('../../models/Delegation');
const VestingStat = require('../../models/VestingStat');
const Reward = require('../../models/Reward');
const Utils = require('../../utils/Utils');

class Genesis {
    constructor() {
        this._isDone = false;

        this._alreadyTypes = {};
        this._usersBulk = new BulkSaver(UserMetaModel, 'profiles');
        this._balancesBulk = new BulkSaver(BalanceModel, 'balances');
        this._balancesVestingBulk = new BulkSaver(VestingBalanceModel, 'balances_vesting');
        this._transfersBulk = new BulkSaver(TransferModel, 'transfers');
        this._delegationsBulk = new BulkSaver(DelegationModel, 'delegations');
        this._rewardsBulk = new BulkSaver(Reward, 'rewards');
    }

    async handle(type, data) {
        if (this._isDone) {
            throw new Error('Method finish has been called already');
        }

        metrics.inc('genesis_handle', { type });

        switch (type) {
            case 'account':
                this._handleAccount(data);
                return true;
            case 'transfer':
                this._handleTransfer(data);
                return true;
            case 'currency':
                await this._handleCurrency(data);
                return true;
            case 'balance':
                await this._handleBalance(data);
                return true;
            case 'delegate':
                this._handleDelegate(data);
                return true;
                // TODO: Need process
                return true;
            case 'stat':
                await this._handleStat(data);
                return true;
            case 'authreward':
            case 'curreward':
            case 'benreward':
            case 'delreward':
                this._handleReward(type, data);
                return true;
            case 'domain':
            case 'message':
            case 'pin':
            case 'block':
                // Skip
                return true;
            default:
                /*
                TODO: implement
                2019-07-15 10:24:12 <1> [log] New unknown genesis data: genesis.conv { owner: 'wxg2iat42thu',
                amount: '20.101 GOLOS',
                memo: '20.101 GOLOS (savings)' }
                 */

                if (!this._alreadyTypes[type]) {
                    this._alreadyTypes[type] = true;
                    Logger.log('New unknown genesis data:', type, data);
                }
                return false;
        }
    }

    _handleReward(eventType, data) {
        switch (eventType) {
            case 'authreward':
                this._handleAuthorReward(data);
                break;
            case 'curreward':
                this._handleCuratorsReward(data);
                break;
            case 'benreward':
                this._handleBeneficiaryReward(data);
                break;
            case 'delreward':
                this._handleDelegatorReward(data);
                break;
            default:
                Logger.warn(`Unknown reward type: ${eventType}`);
                return;
        }
    }

    _handleCuratorsReward(data) {
        //TODO: implement
    }

    _handleDelegatorReward(data) {
        //TODO: implement
    }

    _handleBeneficiaryReward(data) {
        const { benefactor: userId, author, permlink, reward: quantityRaw, time: timestamp } = data;
        const { quantity, sym, tokenType } = this._parseAsset(quantityRaw);

        try {
            this._rewardsBulk.addEntry({
                type: 'benefeciary',
                contentType: 'post',
                contentId: {
                    userId: author,
                    permlink,
                },
                tokenType,
                block: 0,
                trx_id: 0,
                sym,
                quantity,
                timestamp,
                userId,
            });
        } catch (error) {
            Logger.error('Error during beneficiary rewards parsing', error, '\n', data);
        }
    }

    _handleAuthorReward(data) {
        const {
            author,
            permlink,
            sbd_and_steem_payout: quantityRaw,
            time: timestamp,
            userId,
        } = data;

        const { quantity, sym, tokenType } = this._parseAsset(quantityRaw);

        try {
            this._rewardsBulk.addEntry({
                type: 'author',
                contentType: 'post',
                contentId: {
                    userId: author,
                    permlink,
                },
                tokenType,
                block: 0,
                trx_id: 0,
                sym,
                quantity,
                timestamp,
                userId,
            });
        } catch (error) {
            Logger.error('Error during author rewards parsing', error, '\n', data);
        }
    }

    async _handleStat({ supply }) {
        const [stat, sym] = supply.split(' ');

        await VestingStat.create({
            stat,
            sym,
        });
    }

    _handleDelegate(data) {
        const { delegator: from, delegatee: to, quantity, interest_rate: interestRate } = data;

        this._delegationsBulk.addEntry({
            from,
            to,
            quantity,
            interestRate,
        });
    }

    _handleAccount({ owner, name, balance, balance_in_sys: balanceSys, vesting_shares: vesting }) {
        this._usersBulk.addEntry({
            userId: owner,
            username: name,
        });

        this._balancesBulk.addEntry({
            name: owner,
            balances: [balanceSys, balance],
        });

        this._balancesVestingBulk.addEntry({
            account: owner,
            vesting,
            delegated: '0.000000 GOLOS',
            received: '0.000000 GOLOS',
        });

        metrics.inc('genesis_type_account_processed');
    }

    _handleTransfer(data) {
        const { quantityRaw: quantity, sym } = Utils.parseAsset(data.quantity);
        const transferObject = {
            sender: data.from,
            receiver: data.to,
            quantity,
            sym,
            block: 0,
            trx_id: '0',
            memo: data.memo,
            timestamp: new Date(data.time + 'Z'),
        };

        if (!data.to || !data.from) {
            Logger.warn('Invalid transfer data:', data);
            return;
        }

        this._transfersBulk.addEntry(transferObject);
    }

    async _handleCurrency(data) {
        const [, sym] = data.supply.split(' ');

        await TokenModel.updateOne(
            { sym },
            {
                $set: {
                    sym,
                    issuer: data.issuer,
                    supply: data.supply,
                    maxSupply: data.max_supply,
                },
            },
            {
                upsert: true,
            }
        );
    }

    async _handleBalance(data) {
        const { account: name, balance, payments } = data;

        this._balancesBulk.addEntry({
            name,
            balances: [balance],
            payments: [payments],
        });
    }

    _parseAsset(quantityRaw) {
        const [quantity, sym] = quantityRaw.split(' ');
        const asset = quantity.split('.')[1].length;

        let tokenType;
        switch (asset) {
            case 3:
                tokenType = 'liquid';
                break;
            case 6:
                tokenType = 'vesting';
                break;
            default:
                Logger.warn(`Unknown asset: "${sym},${asset}" `);
                return;
        }
        return { quantity, sym, tokenType };
    }

    async typeEnd(type) {
        switch (type) {
            case 'authreward':
            case 'curreward':
            case 'benreward':
                await this._rewardsBulk.finish();
            case 'account':
                await Promise.all([
                    this._usersBulk.finish(),
                    this._balancesBulk.finish(),
                    this._balancesVestingBulk.finish(),
                ]);
                break;
            case 'transfer':
                await this._transfersBulk.finish();
                break;
            case 'delegations':
                await this._delegationsBulk.finish();
                break;
            default:
            // Do nothing
        }
    }

    async finish() {
        // Do nothing
        // GenesisProcessor ожидает что у GenesisController есть метод finish
    }

    getQueueLength() {
        return (
            this._usersBulk.getQueueLength() +
            this._balancesBulk.getQueueLength() +
            this._balancesVestingBulk.getQueueLength() +
            this._transfersBulk.getQueueLength() +
            this._delegationsBulk.getQueueLength() +
            this._rewardsBulk.getQueueLength()
        );
    }
}

module.exports = Genesis;
