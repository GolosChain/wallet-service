const core = require('gls-core-service');
const { Logger } = core.utils;

const env = require('../data/env');

function verbose(...args) {
    if (env.GLS_VERBOSE_LOGS) {
        Logger.info(...args);
    }
}

module.exports = {
    verbose,
};
