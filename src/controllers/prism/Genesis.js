const core = require('gls-core-service');
const { Logger, metrics, BulkSaver } = core.utils;
const UserMetaModel = require('../../models/UserMeta');
const BalanceModel = require('../../models/Balance');
const VestingBalanceModel = require('../../models/VestingBalance');
const TokenModel = require('../../models/Token');
const TransferModel = require('../../models/Transfer');
const DelegationModel = require('../../models/Delegation');
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
            case 'domain':
            case 'message':
            case 'pin':
            case 'block':
                // Skip
                return true;
            default:
                if (!this._alreadyTypes[type]) {
                    this._alreadyTypes[type] = true;
                    Logger.log('New unknown genesis data:', type, data);
                }
                return false;
        }
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

    async typeEnd(type) {
        switch (type) {
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
            this._transfersBulk.getQueueLength()
        );
    }
}

module.exports = Genesis;
