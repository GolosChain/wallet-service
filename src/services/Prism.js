const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;
const MainPrismController = require('../controllers/prism/Main');

class Prism extends BasicService {
    constructor() {
        super();

        this._mainPrismController = new MainPrismController();
    }

    async start() {
        const subscriber = new BlockSubscribe({
            onlyIrreversible: true,
            blockHandler: this._handleBlock.bind(this),
        });

        await subscriber.start();
    }

    async _handleBlock(block) {
        try {
            await this._mainPrismController.disperse(block);
        } catch (error) {
            Logger.error('Cant disperse block:', error);
            process.exit(1);
        }
    }
}

module.exports = Prism;
