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
            handler: this._handleBlock.bind(this),
        });

        try {
            await subscriber.start();
        } catch (error) {
            Logger.error('Cant start block subscriber:', error);
            process.exit(1);
        }
    }

    async _handleBlock({ type, data }) {
        switch (type) {
            case 'IRREVERSIBLE_BLOCK':
                await this._mainPrismController.registerLIB(data.blockNum);
                break;
            case 'BLOCK':
                try {
                    await this._mainPrismController.disperse(data);
                } catch (error) {
                    Logger.error('Cant disperse blockNum:', error);
                    process.exit(1);
                }
                break;

            case 'FORK':
                Logger.info('STARTING FORK ON BLOCK', data.baseBlockNum);
                await this._mainPrismController.handleFork(data.baseBlockNum);
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
