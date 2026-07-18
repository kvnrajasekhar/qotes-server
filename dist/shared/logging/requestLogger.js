const { v4: uuidv4 } = require("uuid");
const { createLogger, withTraceId } = require("./logger");
const logger = createLogger("request-logger");
const requestLoggerMiddleware = (req, res, next) => {
    let traceId = req.headers["x-correlation-id"] || req.headers["x-trace-id"];
    if (!traceId) {
        traceId = `${Date.now()}-${uuidv4()}`;
    }
    req.traceId = traceId;
    req.correlationId = traceId;
    res.setHeader("X-Correlation-ID", traceId);
    res.setHeader("X-Trace-ID", traceId);
    const requestStart = Date.now();
    const originalEnd = res.end;
    res.end = function (...args) {
        const responseTime = Date.now() - requestStart;
        originalEnd.apply(res, args);
        withTraceId(traceId, () => {
            const logData = {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get("user-agent"),
                correlationId: traceId,
            };
            if (res.statusCode >= 500) {
                logger.error("HTTP Request", {
                    ...logData,
                    errorStatus: true,
                });
            }
            else if (res.statusCode >= 400) {
                logger.warn("HTTP Request", {
                    ...logData,
                    clientError: true,
                });
            }
            else {
                logger.info("HTTP Request", logData);
            }
        });
    };
    withTraceId(traceId, () => {
        next();
    });
};
const asyncRequestLoggerMiddleware = (req, res, next) => {
    const traceId = req.headers["x-correlation-id"] || `${Date.now()}-${uuidv4()}`;
    req.traceId = traceId;
    req.correlationId = traceId;
    res.setHeader("X-Correlation-ID", traceId);
    const requestStart = Date.now();
    const originalEnd = res.end;
    res.end = function (...args) {
        const responseTime = Date.now() - requestStart;
        originalEnd.apply(res, args);
        withTraceId(traceId, () => {
            const logData = {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                correlationId: traceId,
            };
            if (res.statusCode >= 500) {
                logger.error("HTTP Request Error", logData);
            }
            else if (res.statusCode >= 400) {
                logger.warn("HTTP Request Warning", logData);
            }
            else {
                logger.info("HTTP Request Success", logData);
            }
        });
    };
    withTraceId(traceId, () => next());
};
const setCorrelationId = (req, res, next) => {
    const traceId = req.headers["x-correlation-id"] || `${Date.now()}-${uuidv4()}`;
    req.traceId = traceId;
    res.setHeader("X-Correlation-ID", traceId);
    next();
};
module.exports = {
    requestLoggerMiddleware,
    asyncRequestLoggerMiddleware,
    setCorrelationId,
};
//# sourceMappingURL=requestLogger.js.map