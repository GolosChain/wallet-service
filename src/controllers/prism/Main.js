const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Vote = require('./Vote');

class Main {
    constructor() {
        this._post = new Post();
        this._comment = new Comment();
        this._profile = new Profile();
        this._vote = new Vote();
    }

    async disperse({ transactions, blockNum }) {
        for (const transaction of transactions) {
            await this._disperseTransaction(transaction, blockNum);
        }
    }

    async _disperseTransaction(transaction, blockNum) {
        if (!transaction) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        console.log(transaction);

        if (transaction.code !== 'cyber.token' && transaction.action !== 'transfer') {
            return;
        }


        // Add logic
    }
}

module.exports = Main;
