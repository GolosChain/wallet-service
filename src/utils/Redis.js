const url = 'redis://wallet-redis:6379';
const redis = require('async-redis');
const client = redis.createClient({ url });

client.on('error', error => {
    console.error('Redis error', error);
});

module.exports = client;
