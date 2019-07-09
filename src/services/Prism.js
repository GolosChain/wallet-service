const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const { Logger, GenesisProcessor } = core.utils;
const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');
const GenesisController = require('../controllers/prism/Genesis');
const ServiceMetaModel = require('../models/ServiceMeta');

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
        const genesisProcessor = new GenesisProcessor({
            genesisController: new GenesisController(),
        });

        await genesisProcessor.process();
    }
}

module.exports = Prism;
