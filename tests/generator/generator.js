const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv').config();
const User = require('./User');
const Logger = require('gls-core-service').utils.Logger;
const WalletRPC = require('../rpc/WalletRPC');

const delay = ms => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};

async function main() {
    if (!process.env.WALLET_NODE_HOST || !process.env.WALLET_NODE_PORT) {
        throw 'Please spicify wallet-node port and host: WALLET_NODE_HOST and WALLET_NODE_PORT';
    }

    const walletRPC = new WalletRPC(process.env.WALLET_NODE_HOST, process.env.WALLET_NODE_PORT);

    Logger.info('Generating new users');
    const generatorResponse = await User.generateUsers(3);
    const users = generatorResponse.map(user => {
        return new User({
            username: user.username,
            alias: user.alias,
            owner_key: user.owner_key,
            active_key: user.active_key,
            posting_key: user.posting_key,
            walletRPC,
        });
    });

    // Ждём окончания всех трансферов до тестов. Будет 2 - 3 трансфера на каждый акк, их необходимо учесть до тестов API кошелька.
    await delay(10000);
    for (const user of users) {
        await user.countUserTransfers();
        delete user._walletRPC;
    }

    fs.writeFile(path.join(__dirname, '../Users.json'), JSON.stringify(users), function(error) {
        if (error) {
            throw error;
        }
    });

    Logger.log(users);
    Logger.info('Generating transfers'); // 0 => 1
    Logger.info(`Sending tokens from ${users[0].username} to ${users[1].username}`);

    for (let i = 0; i < 3; i++) {
        await users[0].transfer({
            to: users[1].username,
            quantity: '0.001 GOLOS',
            memo: `{ "i": ${i}, "msg": "Hello, ${users[1].alias}!"}`,
        });
        await delay(900);
    }

    Logger.info(`Sending tokens from ${users[1].username} to ${users[0].username}`); // 2 => 0
    for (let i = 0; i < 2; i++) {
        await users[1].transfer({
            to: users[0].username,
            quantity: '0.001 GOLOS',
            memo: `{ "i": ${i}, "msg": "New transfer to ${users[0].alias}!"}`,
        });
        await delay(900);
    }

    Logger.info(`Sending tokens from ${users[2].username} to ${users[0].username}`); // 2 => 0
    for (let i = 0; i < 4; i++) {
        await users[2].transfer({
            to: users[0].username,
            quantity: '0.001 GOLOS',
            memo: `{ "i": ${i}, "msg": "Yet another transfer to ${users[0].alias}!"}`,
        });
        await delay(900);
    }

    Logger.info('Sending some tokens to vesting'); // 1 => vesting => 1
    for (let i = 0; i < 2; i++) {
        await users[1].sendToVesting({
            to: users[1].username,
            quantity: '0.001 GOLOS',
        });
        await delay(900);
    }
    Logger.info('Done');

    await delay(10000);
    process.exit();
}

main();
