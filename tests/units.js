const WalletTester = require('./wallet_rpc_tester');

const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

class UnitTests {
    constructor(...args) {
        this._walletTester = new WalletTester(...args);
    }

    async getBalance({ name }) {
        let res = await this._walletTester.getBalance({ name });

        res.should.be.a('object');
        res.should.have.property('id');
        res.should.have.property('result');

        if (!Object.keys(res.result).length) {
            // don't have needed balance
            return;
        }

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

    async filterAccountHistory({ account, from, limit, query }) {
        let res = await this._walletTester.filterAccountHistory({ account, from, limit, query });

        res.should.have.property('result');
        res.result.should.be.a('array');

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
}

module.exports = UnitTests;
