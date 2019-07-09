const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        const connector = new Connector();
        const prism = new Prism();

        this.startMongoBeforeBoot();
        this.addNested(prism, connector);
    }
}

module.exports = Main;
