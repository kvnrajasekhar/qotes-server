"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCorrelationId = exports.asyncRequestLoggerMiddleware = exports.requestLoggerMiddleware = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('request-logger');
const requestLoggerMiddleware = (req, res, next) => {
    const headerId = Array.isArray(req.headers['x-correlation-id'])
        ? req.headers['x-correlation-id'][0]
        : req.headers['x-correlation-id'];
    const headerTrace = Array.isArray(req.headers['x-trace-id'])
        ? req.headers['x-trace-id'][0]
        : req.headers['x-trace-id'];
    let traceId = headerId || headerTrace || `${Date.now()}-${(0, uuid_1.v4)()}`;
    req.traceId = traceId;
    req.correlationId = traceId;
    res.setHeader('X-Correlation-ID', traceId);
    res.setHeader('X-Trace-ID', traceId);
    const requestStart = Date.now();
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
        const responseTime = Date.now() - requestStart;
        const ret = originalEnd(...args);
        (0, logger_1.withTraceId)(traceId, () => {
            const logData = {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                correlationId: traceId,
            };
            if (res.statusCode >= 500) {
                logger.error('HTTP Request', {
                    ...logData,
                    errorStatus: true,
                });
            }
            else if (res.statusCode >= 400) {
                logger.warn('HTTP Request', {
                    ...logData,
                    clientError: true,
                });
            }
            else {
                logger.info('HTTP Request', logData);
            }
        });
        return ret;
    };
    (0, logger_1.withTraceId)(traceId, () => next());
};
exports.requestLoggerMiddleware = requestLoggerMiddleware;
const asyncRequestLoggerMiddleware = (req, res, next) => {
    const headerId = Array.isArray(req.headers['x-correlation-id'])
        ? req.headers['x-correlation-id'][0]
        : req.headers['x-correlation-id'];
    const traceId = headerId || `${Date.now()}-${(0, uuid_1.v4)()}`;
    req.traceId = traceId;
    req.correlationId = traceId;
    res.setHeader('X-Correlation-ID', traceId);
    const requestStart = Date.now();
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
        const responseTime = Date.now() - requestStart;
        const ret = originalEnd(...args);
        (0, logger_1.withTraceId)(traceId, () => {
            const logData = {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                correlationId: traceId,
            };
            if (res.statusCode >= 500) {
                logger.error('HTTP Request Error', logData);
            }
            else if (res.statusCode >= 400) {
                logger.warn('HTTP Request Warning', logData);
            }
            else {
                logger.info('HTTP Request Success', logData);
            }
        });
        return ret;
    };
    (0, logger_1.withTraceId)(traceId, () => next());
};
exports.asyncRequestLoggerMiddleware = asyncRequestLoggerMiddleware;
const setCorrelationId = (req, res, next) => {
    const correlationHeader = req.headers['x-correlation-id'];
    const traceId = (Array.isArray(correlationHeader) ? correlationHeader[0] : correlationHeader) ||
        `${Date.now()}-${(0, uuid_1.v4)()}`;
    req.traceId = traceId;
    res.setHeader('X-Correlation-ID', traceId);
    next();
};
exports.setCorrelationId = setCorrelationId;
//# sourceMappingURL=requestLogger.js.map