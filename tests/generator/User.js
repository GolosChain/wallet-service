const Logger = require('gls-core-service').utils.Logger;
const request = require('request');
const cyberGolos = require('cyber-client').default;

class User {
    constructor(params) {
        this.username = params.username;
        this.alias = params.alias;
        this.owner_key = params.owner_key;
        this.active_key = params.active_key;
        this.posting_key = params.posting_key;

        this._walletRPC = params.walletRPC;    
    }

    static generateUsers(count) {
        return new Promise((resolve, reject) => {
            let url = `${process.env.USER_GENERATOR_HTTP_URL}/generate_users?count=`;
            if (typeof count === 'number' && count > 0) {
                url = url + count;
            } else {
                throw { code: 400, message: 'Bad request: users count must be a positive number' };
            }

            request.get(url, (error, response, body) => {
                if (error) {
                    reject(error);
                }
                const json = JSON.parse(body);
                resolve(json);
            });
        });
    }

    async transfer({ to, quantity, memo }) {
        const accountName = this.username;
        const privateKey = this.active_key;
        const from = accountName;

        await cyberGolos.accountAuth(accountName, privateKey);
        const transaction = await cyberGolos.cyberToken.transfer(
            { accountName },
            {
                from,
                to,
                quantity,
                memo,
            }
        );

        Logger.log('Successful transfer:', {
            id: transaction.transaction_id,
            block_num: transaction.processed.block_num,
            block_time: transaction.processed.block_time,
            from,
            to,
            quantity,
            memo
        });

        return transaction;
    }

    async sendToVesting({ to, quantity }) {
        return this.transfer({
            to: 'gls.vesting',
            quantity,
            memo: `send to: ${to}`,
        });
    }

    async countUserTransfers() {
        const sentTransfers = await this._walletRPC.getHistory({
            sender: this.username,
            sequenceKey: null,
            limit: 100,
        });

        const receivedTransfers = await this._walletRPC.getHistory({
            receiver: this.username,
            sequenceKey: null,
            limit: 100,
        });

        this.sentTransfersCount =  sentTransfers.result.items.length;
        this.receivedTransfersCount =  receivedTransfers.result.items.length;
    }
}

module.exports = User;
