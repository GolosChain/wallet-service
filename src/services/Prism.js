const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;
const MainPrismController = require('../controllers/prism/Main');
const ServiceMetaModel = require('../models/ServiceMeta');

class Prism extends BasicService {
    constructor() {
        super();

        this._mainPrismController = new MainPrismController();
    }

    async start() {
        const { lastSequence, lastBlockTime } = await this._getLastBlockTimeAndSequence();

        const subscriber = new BlockSubscribe({
            lastSequence,
            lastTime: lastBlockTime,
            onlyIrreversible: true,
        });

        subscriber.eachBlock(this._handleBlock.bind(this));

        await subscriber.start();
    }

    async _handleBlock(block) {
        try {
            const lastSequence = block.sequence;
            const lastBlockTime = block.blockTime;

            await this._setLastBlockTimeAndSequence({ lastSequence, lastBlockTime });
            await this._mainPrismController.disperse(block);
        } catch (error) {
            Logger.error('Cant disperse block:', error);
            process.exit(1);
        }
    }

    async _getLastBlockTimeAndSequence() {
        return await ServiceMetaModel.findOne(
            {},
            { _id: false, lastSequence: true, lastBlockTime: true },
            { lean: true }
        );
    }

    async _setLastBlockTimeAndSequence({ lastSequence, lastBlockTime }) {
        await ServiceMetaModel.updateOne({}, { $set: { lastSequence, lastBlockTime } });
    }
}

module.exports = Prism;
