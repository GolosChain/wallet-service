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

        subscriber.on('block', this._handleBlock.bind(this));

        try {
            await subscriber.start();
        } catch (error) {
            Logger.error(`Cant start block subscriber - ${error.stack}`);
        }
    }

    async _handleBlock(block) {
        try {
            const lastSequence = block.sequence;

            await this._setLastBlockTimeAndSequence(lastSequence);
            await this._mainPrismController.disperse(block);
        } catch (error) {
            Logger.error(`Cant disperse block - ${error.stack}`);
            process.exit(1);
        }
    }

    async _getLastBlockTimeAndSequence() {
        const model = await ServiceMetaModel.findOne(
            {},
            { lastSequence: true, lastBlockTime: true },
            { lean: true }
        );

        return { ...model };
    }

    async _setLastBlockTimeAndSequence(lastSequence) {
        await ServiceMetaModel.updateOne({}, { $set: { lastSequence, lastBlockTime: Date.now() } });
    }
}

module.exports = Prism;
