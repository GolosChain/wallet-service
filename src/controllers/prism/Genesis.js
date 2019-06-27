const core = require('gls-core-service');
const { metrics } = core.utils;
const BulkSaver = require('../../utils/BulkSaver');
const UserMetaModel = require('../../models/UserMeta');
const BalanceModel = require('../../models/Balance');
const VestingBalanceModel = require('../../models/VestingBalance');
const TokenModel = require('../../models/Token');
const TransferModel = require('../../models/Transfer');

class Genesis {
    constructor() {
        this._isDone = false;

        this._usersBulk = new BulkSaver(UserMetaModel, 'profiles');
        this._balancesBulk = new BulkSaver(BalanceModel, 'balances');
        this._balancesVestingBulk = new BulkSaver(VestingBalanceModel, 'balances_vesting');
        this._transfersBulk = new BulkSaver(TransferModel, 'transfers');
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
            case 'domain':
            case 'message':
            case 'pin':
            case 'block':
                // Skip
                return true;
            default:
                // Do nothing
                console.log('NEW DATA:', type, data);
                return false;
        }
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
        const transferObject = {
            sender: data.from,
            receiver: data.to,
            quantity: data.quantity,
            block: 0,
            trx_id: '0',
            memo: data.memo,
            timestamp: new Date(data.time + 'Z'),
        };

        this._transfersBulk.addEntry(transferObject);
    }

    async _handleCurrency(data) {
        const [, sym] = data.supply.split(' ');

        await TokenModel.findOneAndUpdate(
            { sym },
            {
                sym,
                issuer: data.issuer,
                supply: data.supply,
                max_supply: data.max_supply,
            },
            {
                upsert: true,
            }
        );
    }

    async _handleBalance(data) {
        // data = {
        //   account: 'gls.vesting',
        //   balance: '119908451.559 GOLOS',
        //   payments: '0.000 GOLOS'
        // }
        // TODO: Implement
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

    getQueueLength() {
        return this._usersBulk.getQueueLength();
    }
}

module.exports = Genesis;
