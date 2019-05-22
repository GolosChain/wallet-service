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

describe('getBalance test', async () => {
    it('getBalance: test 1', async () => {
        await unitTest.getBalance({ name: 'cyber.token' });
    });

    it('getBalance: test 2', async () => {
        await unitTest.getBalance({ name: 'destroyer' });
    });

    it('getBalance: test 3', async () => {
        await unitTest.getBalance({ name: 'korpusenko' });
    });
});

describe('getHistory test', async () => {
    it('getHistory', async () => {
        await unitTest.getHistory({ sender: 'tst1drgfnsgy', sequenceKey: null, limit: 3 });
        await unitTest.getHistory({ receiver: 'gls.vesting', sequenceKey: null, limit: 3 });
    }).timeout(10000);
});

describe('filter_account_history test', async () => {
    it('filter_account_history: empty', async () => {
        await unitTest.filterAccountHistory({
            account: 'cyber.token',
            from: -1,
            limit: 100,
            query: {},
        });
    }).timeout(20000);

    it('filter_account_history: dual', async () => {
        await unitTest.filterAccountHistory({
            account: 'korpusenko',
            from: -1,
            limit: 100,
            query: { direction: 'dual' },
        });
    }).timeout(20000);

    it('filter_account_history: receiver', async () => {
        await unitTest.filterAccountHistory({
            account: 'korpusenko',
            from: -1,
            limit: 100,
            query: { direction: 'receiver' },
        });
    }).timeout(20000);

    it('filter_account_history: sender', async () => {
        await unitTest.filterAccountHistory({
            account: 'cyber.token',
            from: -1,
            limit: 100,
            query: { direction: 'sender' },
        });
    }).timeout(20000);

    it('filter_account_history: last one', async () => {
        await unitTest.filterAccountHistory({
            account: 'cyber.token',
            from: -1,
            limit: 0,
            query: {},
        });
    }).timeout(20000);

    it('filter_account_history: first one', async () => {
        await unitTest.filterAccountHistory({
            account: 'cyber.token',
            from: 0,
            limit: 0,
            query: {},
        });
    }).timeout(20000);

    it('filter_account_history: one from middle', async () => {
        await unitTest.filterAccountHistory({
            account: 'cyber.token',
            from: 4,
            limit: 0,
            query: {},
        });
    }).timeout(20000);

    it('filter_account_history: segment from middle', async () => {
        await unitTest.filterAccountHistory({
            account: 'cyber.token',
            from: 4,
            limit: 3,
            query: {},
        });
    }).timeout(20000);
});

// VESTING //

describe('getVestingInfo test', async () => {
    it('getVestingInfo()', async () => {
        await unitTest.getVestingInfo({});
    });
});

describe('getVestingBalance test', async () => {
    it('getVestingBalance: vesting of testuser', async () => {
        await unitTest.getVestingBalance({ account: 'testuser' });
    });
});

describe('getVestingHistory test', async () => {
    it('getVestingHistory: vesting of testuser: limit 1', async () => {
        await unitTest.getVestingHistory({
            account: 'testuser',
            sequenceKey: null,
            limit: 1,
        });
    });

    it('getVestingHistory: vesting of testuser: limit > 1', async () => {
        await unitTest.getVestingHistory({
            account: 'testuser',
            sequenceKey: null,
            limit: 3,
        });
    });

    it('getVestingHistory: vesting of unknown user', async () => {
        await unitTest.getVestingHistory({
            account: 'asdsatestuser',
            sequenceKey: null,
            limit: 1,
        });
    });
});
