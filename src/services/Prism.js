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
        const {
            lastSequence,
            lastBlockTime,
            lastBlockNum,
        } = await this._getLastBlockTimeAndSequence();

        const subscriber = new BlockSubscribe({
            onlyIrreversible: true,
            blockHandler: this._handleBlock.bind(this),
        });
        await subscriber.setLastBlockMetaData({
            lastBlockSequence: lastSequence,
            lastBlockTime,
            lastBlockNum,
        });

        await subscriber.start();
    }

    async _handleBlock(block) {
        try {
            const {
                sequence: lastSequence,
                blockTime: lastBlockTime,
                blockNum: lastBlockNum,
            } = block;

            await this._setLastBlockTimeAndSequence({ lastSequence, lastBlockTime, lastBlockNum });
            await this._mainPrismController.disperse(block);
        } catch (error) {
            Logger.error('Cant disperse block:', error);
            process.exit(1);
        }
    }

    async _getLastBlockTimeAndSequence() {
        return await ServiceMetaModel.findOne(
            {},
            { _id: false, lastSequence: true, lastBlockTime: true, lastBlockNum: true },
            { lean: true }
        );
    }

    async _setLastBlockTimeAndSequence({ lastSequence, lastBlockTime, lastBlockNum }) {
        await ServiceMetaModel.updateOne(
            {},
            { $set: { lastSequence, lastBlockNum, lastBlockTime } }
        );
    }
}

module.exports = Prism;
