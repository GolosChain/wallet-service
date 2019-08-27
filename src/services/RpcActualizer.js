const core = require('gls-core-service');
const fetch = require('node-fetch');
const env = require('../data/env');
const BasicService = core.services.Basic;
const { Logger } = core.utils;

const REFRESH_INTERVAL = 60 * 1000;

class RpcActualizer extends BasicService {
    async start() {
        this._producers = {};
        this._producersUpdateTime = null;

        await this._refreshData();
        setInterval(this._refreshData.bind(this), REFRESH_INTERVAL);
    }

    getProducers() {
        return {
            producers: this._producers,
            updateTime: this._producersUpdateTime,
        };
    }

    async _refreshData() {
        try {
            const response = await fetch(
                `${env.GLS_CYBERWAY_HTTP_URL}/v1/chain/get_producer_schedule`,
                {
                    method: 'POST',
                }
            );

            const data = await response.json();

            this._producers = data.active.producers.map(producer => ({
                id: producer.producer_name,
                signKey: producer.block_signing_key,
            }));
            this._producersUpdateTime = new Date();
        } catch (err) {
            Logger.error('RpcActualizer tick failed:', err);
        }
    }
}

module.exports = RpcActualizer;
