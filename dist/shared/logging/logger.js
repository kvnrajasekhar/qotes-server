"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncLocalStorage = exports.withTraceId = exports.getTraceId = exports.createLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const async_hooks_1 = require("async_hooks");
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
exports.asyncLocalStorage = asyncLocalStorage;
const getTraceId = () => {
    const context = asyncLocalStorage.getStore();
    return context?.traceId;
};
exports.getTraceId = getTraceId;
const withTraceId = (traceId, callback) => {
    return asyncLocalStorage.run({ traceId }, callback);
};
exports.withTraceId = withTraceId;
const productionFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.printf(({ timestamp, level, message, service, stack, ...meta }) => {
    const logObj = {
        timestamp,
        level,
        service: service || "unknown-service",
        message,
    };
    const traceId = getTraceId();
    if (traceId) {
        logObj.traceId = traceId;
    }
    if (stack) {
        logObj.stack = stack;
    }
    if (Object.keys(meta).length > 0) {
        logObj.metadata = meta;
    }
    return JSON.stringify(logObj);
}));
const developmentFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, service, stack, ...meta }) => {
    const traceId = getTraceId();
    const traceIdStr = traceId ? ` [${traceId}]` : "";
    const serviceStr = service ? ` [${service}]` : "";
    const stackStr = stack ? `\n${stack}` : "";
    const metaStr = Object.keys(meta).length > 0
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";
    return `${timestamp} ${level}${serviceStr}${traceIdStr}: ${message}${stackStr}${metaStr}`;
}));
const createLogger = (serviceName = "default-service") => {
    const transports = [];
    const env = (process.env.NODE_ENV || "development").trim();
    const isProduction = env === "production";
    const enableFileLogging = (process.env.ENABLE_FILE_LOGGING || "").trim().toLowerCase() === "true" ||
        isProduction;
    console.log(`--- LOGGER DEBUG [${serviceName}]: NODE_ENV='${process.env.NODE_ENV}', ENABLE_FILE_LOGGING='${process.env.ENABLE_FILE_LOGGING}', Computed Flag=${enableFileLogging} ---`);
    const logsDir = path_1.default.resolve(__dirname, "../../../logs");
    console.log(`--- FILESYSTEM TARGET PATH: '${logsDir}' ---`);
    transports.push(new winston_1.default.transports.Console({
        format: isProduction ? productionFormat : developmentFormat,
        level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    }));
    if (enableFileLogging) {
        transports.push(new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logsDir, "application-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxSize: "20m",
            maxFiles: "14d",
            zippedArchive: true,
            format: productionFormat,
            level: process.env.LOG_LEVEL || "info",
        }));
        transports.push(new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logsDir, "errors", "error-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxSize: "20m",
            maxFiles: "14d",
            zippedArchive: true,
            format: productionFormat,
            level: "error",
        }));
    }
    return winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
        defaultMeta: { service: serviceName },
        transports,
        exceptionHandlers: [
            new winston_1.default.transports.Console({
                format: isProduction ? productionFormat : developmentFormat,
            }),
        ],
        rejectionHandlers: [
            new winston_1.default.transports.Console({
                format: isProduction ? productionFormat : developmentFormat,
            }),
        ],
    });
};
exports.createLogger = createLogger;
//# sourceMappingURL=logger.js.map