const WalletTester = require('./wallet_rpc_tester');

const chai = require('chai');
const should = chai.should();
const expect = chai.expect;


class UnitTests {
    constructor(...args) {
        // console.log(args);
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



    async info() {

    }

    // transfer(string from, string to, asset amount, string memo, bool broadcast)
    async transfer(from, to, amount, memo, broadcast) {
    }

};

module.exports = UnitTests;