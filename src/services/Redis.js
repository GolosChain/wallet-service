const core = require('gls-core-service');
const BasicService = core.services.Basic;

const redis = require('async-redis');

class Redis extends BasicService {
    constructor({ url }) {
        super();
        this.url = url;
    }

    async start(...args) {
        await super.start(...args);
        this.client = await redis.createClient({ url: this.url });

        this.client.on('error', error => {
            console.error('Redis error', error);
        });
    }

    async setCache(key, value, { dbPrefix = '', ttl = 3 }) {
        const stringKey = this._stringifyData(key);
        const stringValue = this._stringifyData(value);

        await this.client.set(stringKey, stringValue);
        await this.client.expire(stringKey, ttl);
    }

    async readCache(key) {
        const stringKey = this._stringifyData(key);
        const cache = await this.client.get(stringKey);
        try {
            return JSON.parse(cache);
        } catch {
            return cache;
        }
    }

    async invalidateCache(key) {
        // todo: implement
    }

    _stringifyData(data) {
        if (typeof data === 'object') {
            return JSON.stringify(data);
        } else return data.toString;
    }
}

module.exports = Redis;
