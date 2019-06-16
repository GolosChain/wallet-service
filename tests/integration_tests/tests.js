const dotenv = require('dotenv').config();
const users = require('../Users.json');
const Check = require('./Check');
const WalletRPC = require('../rpc/WalletRPC');
const Logger = require('gls-core-service').utils.Logger;

const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

if (!process.env.WALLET_NODE_HOST || !process.env.WALLET_NODE_PORT) {
    throw 'Please spicify wallet-node port and host: WALLET_NODE_HOST and WALLET_NODE_PORT';
}

const walletRPC = new WalletRPC(process.env.WALLET_NODE_HOST, process.env.WALLET_NODE_PORT);
const check = new Check({ walletRPC });

describe('getBalance test', async () => {
    for (let i = 0; i < users.length; i++) {
        it(`getBalance #${i}: userId: ${users[i].username}`, async () => {
            await check.getBalance({ name: users[i].username });
        });
    }
});

describe('getHistory test', async () => {
    it(`getHistory: check limit correct work`, async () => {
        // Количество трансферов сделаных generator.js с получателем users[0].username
        const trxCount = 3;
        // Возможно несколько "лишних" трансферов получаем при создании аккаунта через тестовый API
        const totalTrxCount = users[0].sentTransfersCount + trxCount;

        let res = await check.getHistory({
            sender: users[0].username,
            sequenceKey: null,
            limit: trxCount,
        });
        expect(res.result.sequenceKey).not.equal(null);
        expect(res.result.items.length).be.equal(trxCount);

        res = await check.getHistory({
            sender: users[0].username,
            sequenceKey: null,
            limit: totalTrxCount,
        });
        expect(res.result.sequenceKey).not.equal(null);
        expect(res.result.items.length).be.equal(totalTrxCount);

        res = await check.getHistory({
            sender: users[0].username,
            sequenceKey: null,
            limit: totalTrxCount + 1,
        });
        expect(res.result.sequenceKey).be.equal(null);
        expect(res.result.items.length).be.equal(totalTrxCount);
    });

    it(`getHistory: check correct sent and received transfers count`, async () => {
        // Учитываем трансферы совершенные до запуска generator.js
        const sentCount = 3;
        const receivedCount = 6;

        const totalTrxCount =
            users[0].sentTransfersCount +
            users[0].receivedTransfersCount +
            receivedCount +
            sentCount;

        const sentTransfers = await check.getHistory({
            sender: users[0].username,
            sequenceKey: null,
            limit: 100,
        });
        const actualSentCount = sentTransfers.result.items.length;

        const receivedTransfers = await check.getHistory({
            receiver: users[0].username,
            sequenceKey: null,
            limit: 100,
        });
        const actualReceivedCount = receivedTransfers.result.items.length;

        expect(actualSentCount + actualReceivedCount).be.equal(totalTrxCount);
    });

    it(`getHistory: both sender and receiver are specified`, async () => {
        const secondToFirstCount = await check.getHistory({
            sender: users[1].username,
            receiver: users[0].username,
            sequenceKey: null,
            limit: 100,
        });
        expect(secondToFirstCount.result.items.length).be.equal(2);

        const firstToSecondCount = await check.getHistory({
            sender: users[2].username,
            receiver: users[0].username,
            sequenceKey: null,
            limit: 100,
        });
        expect(firstToSecondCount.result.items.length).be.equal(4);
    });
});

// deprecated
// describe('filter_account_history test', async () => {
//     it(`filter_account_history: empty`, async () => {
//         await check.filterAccountHistory({
//             account: 'cyber.token',
//             from: -1,
//             limit: 100,
//             query: {},
//         });
//     }).timeout(20000);

//     it(`filter_account_history: dual`, async () => {
//         await check.filterAccountHistory({
//             account: 'korpusenko',
//             from: -1,
//             limit: 100,
//             query: { direction: 'dual' },
//         });
//     }).timeout(20000);

//     it(`filter_account_history: receiver`, async () => {
//         await check.filterAccountHistory({
//             account: 'korpusenko',
//             from: -1,
//             limit: 100,
//             query: { direction: 'receiver' },
//         });
//     }).timeout(20000);

//     it(`filter_account_history: sender`, async () => {
//         await check.filterAccountHistory({
//             account: 'cyber.token',
//             from: -1,
//             limit: 100,
//             query: { direction: 'sender' },
//         });
//     }).timeout(20000);

//     it(`filter_account_history: last one`, async () => {
//         await check.filterAccountHistory({
//             account: 'cyber.token',
//             from: -1,
//             limit: 0,
//             query: {},
//         });
//     }).timeout(20000);

//     it(`filter_account_history: first one`, async () => {
//         await check.filterAccountHistory({
//             account: 'cyber.token',
//             from: 0,
//             limit: 0,
//             query: {},
//         });
//     }).timeout(20000);

//     it(`filter_account_history: one from middle`, async () => {
//         await check.filterAccountHistory({
//             account: 'cyber.token',
//             from: 4,
//             limit: 0,
//             query: {},
//         });
//     }).timeout(20000);

//     it(`filter_account_history: segment from middle`, async () => {
//         await check.filterAccountHistory({
//             account: 'cyber.token',
//             from: 4,
//             limit: 3,
//             query: {},
//         });
//     }).timeout(20000);
// });

// VESTING //

describe('getVestingInfo test', async () => {
    it(`getVestingInfo()`, async () => {
        await check.getVestingInfo({});
    });
});

describe('getVestingBalance test', async () => {
    it(`getVestingBalance: check vesting balance of ${users[1].username}`, async () => {
        await check.getVestingBalance({ account: users[1].username });
    });
});

describe('getVestingHistory test', async () => {
    it(`getVestingHistory: vesting of ${users[1].username}: limit 1`, async () => {
        const res = await check.getVestingHistory({
            account: users[1].username,
            sequenceKey: null,
            limit: 1,
        });
        expect(res.result.items.length).be.equal(1);
        expect(res.result.sequenceKey).not.be.equal(null);
    });

    it(`getVestingHistory: vesting of ${users[0].username}: limit > 1`, async () => {
        const res = await check.getVestingHistory({
            account: users[1].username,
            sequenceKey: null,
            limit: 4,
        });
        expect(res.result.items.length).be.equal(4);
        expect(res.result.sequenceKey).not.be.equal(null);
    });

    it(`getVestingHistory: vesting of ${users[0].username}: limit ~inf`, async () => {
        const res = await check.getVestingHistory({
            account: users[1].username,
            sequenceKey: null,
            limit: 100,
        });
        expect(res.result.items.length).be.equal(4);
        expect(res.result.sequenceKey).be.equal(null);
    });

    it(`getVestingHistory: vesting of unknown user`, async () => {
        const res = await check.getVestingHistory({
            account: 'asdsatestuser',
            sequenceKey: null,
            limit: 1,
        });

        expect(res.result.items.length).be.equal(0);
        expect(res.result.sequenceKey).be.equal(null);
    });
});
