const core = require('gls-core-service');
const BasicMain = core.services.BasicMain;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const RpcActualizer = require('./services/RpcActualizer');
const ServiceMetaModel = require('./models/ServiceMeta');

class Main extends BasicMain {
    constructor() {
        super(env);

        const rpcActualizer = new RpcActualizer();

        const connector = new Connector({ rpcActualizer });
        const prism = new Prism();

        this.startMongoBeforeBoot(null, {
            poolSize: 500,
        });
        this.addNested(rpcActualizer, prism, connector);
    }

    async boot() {
        if ((await ServiceMetaModel.countDocuments()) === 0) {
            const model = new ServiceMetaModel();

            await model.save();
        }
    }
}

module.exports = Main;
