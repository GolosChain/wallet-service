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

    // Management methods
    async isLocked() {
        return await this.rpcCall('is_locked', []);
    }

    async lock() {
        return await this.rpcCall('lock', []);
    }

    async unlock(password) {
        return await this.rpcCall('unlock', [password]);
    }

    async setPassword(password) {
        return await this.rpcCall('set_password', [password]);
    }

    async importKey(key) {
        return await this.rpcCall('import_key', [key]);
    }

    async info() {
        return await this.rpcCall('info', []);
    }

    async transfer(from, to, amount, memo, broadcast) {
        return await this.rpcCall('transfer', [from, to, amount, memo, broadcast]);
    }

    async listMyAccounts() {
        // unable to use
    }


    async getBalance({ name }) {
        return await this.rpcCall('getBalance', { name });
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
