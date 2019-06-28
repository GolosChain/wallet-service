const chai = require('chai');
const Logger = require('gls-core-service').utils.Logger;
const should = chai.should();
const expect = chai.expect;

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

class Check {
    constructor({ walletRPC }) {
        this._walletTester = walletRPC;
    }

    async getBalance({ name }) {
        const res = await this._walletTester.getBalance({ name });

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        if (!Object.keys(res.result).length) {
            throw new Error(`Don't have any saved balance for account: ${{ name }}`);
        }

        res.id.should.be.a('number');
        res.result.should.be.a('object');

        res.result.name.should.be.a('string');
        res.result.balances.should.be.a('array');

        for (const b of res.result.balances) {
            await _checkAsset(b);
        }
        return res;
    }

    async getHistory(args) {
        const res = await this._walletTester.getHistory(args);

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        if (isEmpty(res.result)) {
            throw `Empty getHistory response: ${{ args }}`;
        }

        res.id.should.be.a('number');
        res.result.should.be.a('object');

        res.result.should.have.property('items');
        res.result.items.should.be.a('array');

        for (const transfer of res.result.items) {
            transfer.should.have.property('sender');
            transfer.should.have.property('receiver');
            transfer.should.have.property('quantity');

            transfer.sender.should.be.a('string');
            transfer.receiver.should.be.a('string');
            transfer.quantity.should.be.a('string');

            await _checkAsset(transfer.quantity);
        }

        res.result.should.have.property('sequenceKey');
        if (res.result.sequenceKey !== null) {
            res.result.sequenceKey.should.satisfy(val => {
                return typeof val === 'string' || val === null;
            });
        }

        return res;
    }

    // deprecated
    async filterAccountHistory({ account, from, limit, query }) {
        const res = await this._walletTester.filterAccountHistory({ account, from, limit, query });

        res.should.have.property('result');
        res.result.should.be.a('array');

        if (!res.result) {
            throw `Empty filterAccountHistory response: ${{ account, from, limit, query }}`;
        }

        for (const el of res.result) {
            el.should.be.a('array');
            el[0].should.be.a('number');
            el[1].should.be.a('object');

            el[1].should.have.property('op');
            el[1].op.should.be.a('array');

            el[1].op[0].should.be.a('string');
            el[1].op[1].should.be.a('object');

            el[1].op[1].should.have.property('from');
            el[1].op[1].should.have.property('to');
            el[1].op[1].should.have.property('amount');
            el[1].op[1].should.have.property('memo');

            el[1].op[1].from.should.be.a('string');
            el[1].op[1].to.should.be.a('string');
            el[1].op[1].amount.should.be.a('string');
            el[1].op[1].memo.should.be.a('string');

            el[1].should.have.property('trx_id');
            el[1].should.have.property('block');
            el[1].should.have.property('timestamp');

            el[1].trx_id.should.be.a('string');
            el[1].block.should.be.a('number');
            el[1].timestamp.should.be.a('string');
        }
    }

    // vesting

    async getVestingInfo(args) {
        const res = await this._walletTester.getVestingInfo(args);
        res.should.be.a('object');

        res.should.have.property('result');
        res.should.have.property('id');
        res.should.have.property('jsonrpc');

        if (isEmpty(res.result)) {
            return;
        }

        await _checkAsset(res.result.stat);

        return res;
    }

    async getVestingBalance(args) {
        let res = await this._walletTester._getVestingBalance(args);
        res.should.be.a('object');

        res.should.have.property('result');
        res.should.have.property('id');
        res.should.have.property('jsonrpc');

        res = res.result;

        if (isEmpty(res)) {
            return;
        }

        res.should.have.property('account');
        res.should.have.property('received');
        res.should.have.property('vesting');
        res.should.have.property('delegated');

        res.account.should.be.a('string');

        await _checkAsset(res.received.GESTS);
        await _checkAsset(res.vesting.GESTS);
        await _checkAsset(res.delegated.GESTS);

        await _checkAsset(res.received.GOLOS);
        await _checkAsset(res.vesting.GOLOS);
        await _checkAsset(res.delegated.GOLOS);

        return res;
    }

    async getVestingHistory(args) {
        const res = await this._walletTester.getVestingHistory(args);
        res.should.be.a('object');

        res.should.have.property('result');
        res.should.have.property('id');
        res.should.have.property('jsonrpc');

        if (isEmpty(res.result)) {
            return;
        }

        for (const c of res.result.items) {
            c.should.have.property('who');
            c.should.have.property('diff');
            c.should.have.property('trx_id');
            c.should.have.property('block');
            c.should.have.property('timestamp');

            c.who.should.be.a('string');
            await _checkAsset(c.diff.GESTS);
            await _checkAsset(c.diff.GOLOS);
            c.block.should.be.a('number');
            c.trx_id.should.be.a('string');
            c.timestamp.should.be.a('string');
        }

        res.result.should.have.property('sequenceKey');

        if (res.result.sequenceKey !== null) {
            res.result.sequenceKey.should.satisfy(val => {
                return typeof val === 'string' || val === null;
            });
        }

        return res;
    }
}

const _checkAsset = async asset => {
    asset.should.be.a('string');

    const parts = asset.split(' ');
    const assetAmount = parseInt(parts[0]);
    const assetName = parts[1];

    assetAmount.should.be.a('number');
    assetName.should.be.a('string');
};

module.exports = Check;
