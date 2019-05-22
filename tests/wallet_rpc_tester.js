const jayson = require('jayson');

class WalletTester {
    constructor(...args) {
        this._client = jayson.client.http({
            host: args[0],
            port: args[1],
        });
    }

    rpcCall(methodName, params) {
        return new Promise((resolve, reject) => {
            let id = genRequestId();

            this._client.request(methodName, params, id, (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            });
        });
    }

    async getBalance(args) {
        return await this.rpcCall('getBalance', args);
    }

    async getHistory(args) {
        return await this.rpcCall('getHistory', args);
    }

    async filterAccountHistory(args) {
        return await this.rpcCall('filter_account_history', args);
    }

    // VESTING

    async getVestingInfo(args) {
        return await this.rpcCall('getVestingInfo', args);
    }

    async getVestingBalance(args) {
        return await this.rpcCall('getVestingBalance', args);
    }

    async getVestingHistory(args) {
        return await this.rpcCall('getVestingHistory', args);
    }
}

module.exports = WalletTester;

const getRandomArbitrary = (minRandValue, maxRandValue) => {
    return (Math.random() * (maxRandValue - minRandValue) + minRandValue) | 0;
};

const genRequestId = () => {
    const minIdValue = 1;
    const maxIdValue = 1000000;

    return getRandomArbitrary(minIdValue, maxIdValue);
};
