const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;
const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');
const ServiceMetaModel = require('../models/ServiceMeta');
const GenesisProcessor = require('../utils/GenesisProcessor');

class Prism extends BasicService {
    constructor() {
        super();

        this._mainPrismController = new MainPrismController();
    }

    async start() {
        const info = await this._getMeta();

        if (!info.isGenesisApplied && !env.GLS_SKIP_GENESIS) {
            await this._processGenesis();
            await this._updateMeta({ isGenesisApplied: true });
        }

        const subscriber = new BlockSubscribe({
            onlyIrreversible: true,
            blockHandler: this._handleBlock.bind(this),
        });

        try {
            await subscriber.start();
        } catch (error) {
            Logger.error('Cant start block subscriber:', error);
            process.exit(1);
        }
    }

    async _handleBlock(block) {
        try {
            await this._mainPrismController.disperse(block);
        } catch (error) {
            Logger.error('Cant disperse block:', error);
            process.exit(1);
        }
    }

    async _getMeta() {
        return await ServiceMetaModel.findOne({}, {}, { lean: true });
    }

    async _updateMeta(params) {
        await ServiceMetaModel.updateOne({}, { $set: params });
    }

    async _processGenesis() {
        const genesis = new GenesisProcessor();
        await genesis.process();
    }
}

module.exports = Prism;
