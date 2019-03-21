const chai = require('chai');

const should = chai.should();
const expect = chai.expect;

const cliWalletPassword = '1';
const UnitTests = require('./units');

let endpointCW = {
    ip: '0.0.0.0',
    port: 8091,
};

let endpointGLS = {
    ip: '127.0.0.1',
    port: 8092,
};

let endpoint = endpointCW;
let unitTest = new UnitTests(endpoint.ip, endpoint.port);

let cfg = {
    password1: 'aaaaaaaa',
    password2: 'bbbbbbbb',
    password3: 'cccccccc',

    key1: '5JiBoYuME7P3zqCATtvyhzW51rdd9yPDtvxgVfmRsyhEUWmMGCs',
    key2: '5Jn9TkccBkeMUqWLkaQJVz71Tfffo2EMFpxaRjnjqMETBmzZ2sh',
};

describe('new wallet operations', async () => {
    it('set_password', async () => {
        await unitTest.setPassword(cfg.password1);
    });

    it('unlock', async () => {
        await unitTest.unlock(cfg.password1);
    });

    it('lock', async () => {
        await unitTest.lock();
    });

    it('importKey', async () => {
        await unitTest.unlock(cfg.password1);
        await unitTest.importKey(cfg.key1);
    });
});

describe('getBalance test', async () => {
    it('getBalance', async () => {
        await unitTest.getBalance({ name: 'cyber.token' });
        await unitTest.getBalance({ name: 'destroyer' });
        await unitTest.getBalance({ name: 'korpusenko' });
    });
});
