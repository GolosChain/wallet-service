const core = require('gls-core-service');
const metrics = core.utils.metrics;

class MetricsUtils {
    constructor({ prefix = 'wallet', interval = 10000 }) {
        this._prefix = prefix;
        this.totalRequestsIn = 0;
        this.totalRequestsOut = 0;
        this.currentRPS = 0;
        this.interval = interval;
        this.requestsMap = new Map();
    }

    start() {
        this.intervalId = setInterval(this._recordMetrics.bind(this), this.interval);
    }

    stop() {
        clearInterval(this.intervalId);
    }

    requestIn(requestName) {
        this.totalRequestsIn++;
        const requestMetricPrefix = `${this._prefix}_${MetricsUtils._toSnakeCase(requestName)}`;
        const metricsData = this._getMetrixData(requestMetricPrefix);

        metricsData[`${requestMetricPrefix}_total_requests`]++;
        metricsData[`${requestMetricPrefix}_requests_in_progress`]++;
    }

    requestOut(requestName) {
        this.totalRequestsOut++;
        this.currentRPS++;

        const requestMetricPrefix = `${this._prefix}_${MetricsUtils._toSnakeCase(requestName)}`;
        const metricsData = this._getMetrixData(requestMetricPrefix);

        metricsData[`${requestMetricPrefix}_requests_in_progress`]--;
    }

    _recordMetrics() {
        for (const metricEntry in this.requestsMap.entries()) {
            for (const metricName in metricEntry) {
                metrics.set(metricName, metricEntry[metricEntry]);
            }
        }
        metrics.set(`${this._prefix}_total_requests_in`, this.totalRequestsIn);
        metrics.set(`${this._prefix}_total_requests_out`, this.totalRequestsOut);
        metrics.set(`${this._prefix}_total_requests_rps`, this.currentRPS / (this.interval / 1000));
        // this is the last step
        this.currentRPS = 0;
    }

    _getMetrixData(requestMetricPrefix) {
        if (!this.requestsMap.has(requestMetricPrefix)) {
            this.requestsMap.set(requestMetricPrefix, {
                [`${requestMetricPrefix}_total_requests`]: 0,
                [`${requestMetricPrefix}_requests_in_progress`]: 0,
                [`${requestMetricPrefix}_rps`]: 0,
            });
        }

        return this.requestsMap.get(requestMetricPrefix);
    }

    static _toSnakeCase(str) {
        return str
            .split(/(?=[A-Z])/)
            .join('_')
            .toLowerCase();
    }
}

module.exports = MetricsUtils;
