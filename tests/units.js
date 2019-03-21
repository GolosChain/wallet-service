const WalletTester = require('./wallet_rpc_tester');

const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

class UnitTests {
    constructor(...args) {
        this._walletTester = new WalletTester(...args);
    }
    // Management methods
    async isLocked() {
        let res = await this._walletTester.isLocked();
        console.log({ is_locked: res });

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        res.id.should.be.a('number');
        res.result.should.be.a('boolean');
    }

    async lock() {
        let res = await this._walletTester.lock();
        console.log({ lock: res });

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        res.id.should.be.a('number');
        should.equal(res.result, null);
    }

    async unlock(password) {
        let res = await this._walletTester.unlock(password);
        console.log({ unlock: res });

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        res.id.should.be.a('number');
        should.equal(res.result, null);
    }

    async setPassword(password) {
        let res = await this._walletTester.setPassword(password);
        console.log({ set_password: res });

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        res.id.should.be.a('number');
        should.equal(res.result, null);
    }

    async importKey(key) {
        let res = await this._walletTester.importKey(key);
        console.log({ import_key: res });

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        res.id.should.be.a('number');
        res.result.should.be.a('boolean');
    }

    async info() { }

    async transfer(from, to, amount, memo, broadcast) { }

    async getBalance({ name }) {
        let res = await this._walletTester.getBalance({ name });
        console.log(JSON.stringify(res, null, 2));

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        res.id.should.be.a('number');
        res.result.should.be.a('object');

        res.result.name.should.be.a('string');
        res.result.balances.should.be.a('array');

        res.result.balances.forEach(b => {
            b.should.have.property('amount');
            b.should.have.property('decs');
            b.should.have.property('sym');

            b.amount.should.be.a('number');
            b.decs.should.be.a('number');
            b.sym.should.be.a('string');
        });
    }

    async getHistory({ query }) {
        let res = await this._walletTester.getHistory({ query });
        console.log(JSON.stringify(res, null, 2));

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        res.id.should.be.a('number');
        res.result.should.be.a('object');

        res.result.should.have.property('transfers');
        res.result.transfers.should.be.a('array');

        for (const transfer of res.result.transfers) {
            transfer.should.have.property('sender');
            transfer.should.have.property('receiver');
            transfer.should.have.property('quantity');

            transfer.sender.should.be.a('string');
            transfer.receiver.should.be.a('string');
            transfer.quantity.should.be.a('object');

            transfer.quantity.should.have.property('amount');
            transfer.quantity.should.have.property('decs');
            transfer.quantity.should.have.property('sym');

            transfer.quantity.amount.should.be.a('number');
            transfer.quantity.decs.should.be.a('number');
            transfer.quantity.sym.should.be.a('string');
        }
    }
}

module.exports = UnitTests;
