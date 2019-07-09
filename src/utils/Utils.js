const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const VestingBalance = require('../models/VestingBalance');
const VestingStat = require('../models/VestingStat');
const BalanceModel = require('../models/Balance');
const TokenModel = require('../models/Token');

class Utils {
    static async extractArgumentList({ args, fields }) {
        if (!Array.isArray(fields)) {
            Logger.warn('_extractArgumentList: invalid argument');
            throw { code: 805, message: 'Wrong arguments' };
        }

        for (const f of fields) {
            if (typeof f !== 'string') {
                Logger.warn('_extractArgumentList: invalid argument:', f);
                throw { code: 805, message: 'Wrong arguments' };
            }
        }

        const result = {};

        if (args) {
            if (Array.isArray(args)) {
                if (args.length !== fields.length) {
                    Logger.warn(
                        `_extractArgumentList: invalid argument: args.length !== fields.length`
                    );
                    throw { code: 805, message: 'Wrong arguments' };
                }

                for (const i in args) {
                    result[fields[i]] = args[i];
                }
            } else {
                for (const f of fields) {
                    result[f] = args[f];
                }
            }
        }

        return result;
    }

    static checkAsset(asset) {
        if (typeof asset !== 'string') {
            return;
        }

        const parts = asset.split(' ');

        let amountString = parts[0];
        amountString = amountString.replace('.', '');

        let decsString = parts[0];
        decsString = decsString.split('.')[1];

        const sym = parts[1];
        const amount = parseInt(amountString);
        const decs = decsString.length;

        return { sym, amount, decs };
    }

    static convertAssetToString({ sym, amount, decs }) {
        const divider = new BigNum(10).pow(decs);
        const leftPart = new BigNum(amount).div(divider).toString();

        return `${leftPart} ${sym}`;
    }
    // conversion methods helpers

    static checkVestingStatAndBalance({ vestingBalance, vestingStat }) {
        if (!vestingStat) {
            Logger.error('convert: no records about vesting stats in base');
            throw { code: 811, message: 'Data is absent in base' };
        }

        if (!vestingBalance.liquid || !vestingBalance.liquid.GOLOS) {
            Logger.error('convert: no GOLOS balance for gls.vesting account');
            throw { code: 811, message: 'Data is absent in base' };
        }
    }

    static checkDecsValue({ decs, requiredValue }) {
        if (decs !== requiredValue) {
            Logger.error(`convert: invalid argument ${decs}. decs must be equal ${requiredValue}`);
            throw { code: 805, message: 'Wrong arguments' };
        }
    }

    static parseAsset(asset) {
        if (!asset) {
            throw new Error('Asset is not defined');
        }
        const [quantityRaw, sym] = asset.split(' ');
        const quantity = new BigNum(asset);
        return {
            quantityRaw,
            quantity,
            sym,
        };
    }

    // Converts transfers quantity data to asset string
    // Like: "123.000 GLS"
    static formatQuantity(quantity) {
        return (
            new BigNum(quantity.amount).shiftedBy(-quantity.decs).toString() + ' ' + quantity.sym
        );
    }

    static async convertTokensToVesting({ tokens }) {
        const { decs, amount } = await Utils.checkAsset(tokens);

        await Utils.checkDecsValue({ decs, requiredValue: 3 });

        const { balance, supply } = await Utils.getVestingSupplyAndBalance();
        const base = new BigNum(amount);
        const multiplier = new BigNum(supply);
        const divider = new BigNum(balance);
        const calculatedAmount = base
            .times(multiplier)
            .div(divider)
            .dp(0);
        return Utils.convertAssetToString({
            sym: 'GOLOS',
            amount: calculatedAmount.toString(),
            decs: 6,
        });
    }

    static async getVestingInfo() {
        const vestingStat = await VestingStat.findOne();

        if (!vestingStat) {
            return {};
        }

        return { stat: vestingStat.stat };
    }

    static async getBalance({ userId, currencies, type }) {
        const result = {
            userId,
        };

        let tokensMap = {};

        if (type !== 'liquid') {
            const {
                vesting: total,
                delegated: outDelegate,
                received: inDelegated,
            } = await Utils.getVestingBalance({ account: userId });

            result.vesting = { total, outDelegate, inDelegated };
        }

        if (type !== 'vesting') {
            const balanceObject = await BalanceModel.findOne({ name: userId });

            if (balanceObject) {
                result.liquid = {};
                if (currencies.includes('all')) {
                    const allCurrencies = await TokenModel.find(
                        {},
                        { _id: false, sym: true },
                        { lean: true }
                    );

                    for (const currency of allCurrencies) {
                        tokensMap[currency.sym] = true;
                    }
                } else {
                    for (const token of currencies) {
                        tokensMap[token] = true;
                    }
                }
                for (const tokenBalance of balanceObject.balances) {
                    const { sym, quantityRaw } = await Utils.parseAsset(tokenBalance);
                    if (tokensMap[sym]) {
                        result.liquid[sym] = quantityRaw;
                    }
                }
            }
        }

        return result;
    }

    static async getVestingSupplyAndBalance() {
        const vestingStat = await Utils.getVestingInfo();
        const vestingBalance = await Utils.getBalance({
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

    static async getVestingBalance({ account }) {
        const vestingBalance = await VestingBalance.findOne({ account });

        if (!vestingBalance) {
            return {};
        }

        vestingBalance.vesting = Utils.parseAsset(vestingBalance.vesting).quantityRaw;
        vestingBalance.delegated = Utils.parseAsset(vestingBalance.delegated).quantityRaw;
        vestingBalance.received = Utils.parseAsset(vestingBalance.received).quantityRaw;

        const { quantityRaw: vestingInGolos } = await Utils.convertVestingToToken({
            vesting: vestingBalance.vesting,
            type: 'parsed',
        });
        const { quantityRaw: delegatedInGolos } = await Utils.convertVestingToToken({
            vesting: vestingBalance.delegated,
            type: 'parsed',
        });
        const { quantityRaw: receivedInGolos } = await Utils.convertVestingToToken({
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

    static async convertVestingToToken({ vesting, type }) {
        const { decs, amount } = await Utils.checkAsset(vesting);

        await Utils.checkDecsValue({ decs, requiredValue: 6 });

        const { balance, supply } = await Utils.getVestingSupplyAndBalance();
        const base = new BigNum(amount);
        const multiplier = new BigNum(balance);
        const divider = new BigNum(supply);
        const calculatedAmount = base
            .times(multiplier)
            .div(divider)
            .dp(0);
        const resultString = Utils.convertAssetToString({
            sym: 'GOLOS',
            amount: calculatedAmount.toString(),
            decs: 3,
        });

        if (type === 'string') {
            return resultString;
        }
        return Utils.parseAsset(resultString);
    }
}

module.exports = Utils;
