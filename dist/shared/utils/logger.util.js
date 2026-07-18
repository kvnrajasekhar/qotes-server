"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";
const safeStringify = (obj) => {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[Circular]";
            }
            seen.add(value);
        }
        return value;
    });
};
const sharedFormat = winston_1.format.combine(winston_1.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.metadata({
    fillExcept: ["message", "level", "timestamp", "label"],
}));
const consoleFormat = isProduction
    ? winston_1.format.combine(sharedFormat, winston_1.format.json())
    : winston_1.format.combine(sharedFormat, winston_1.format.colorize({ all: true }), winston_1.format.printf(({ timestamp, level, message, stack, metadata }) => {
        const meta = metadata && Object.keys(metadata).length
            ? ` ${safeStringify(metadata)}`
            : "";
        return stack
            ? `${timestamp} ${level}: ${message} - ${stack}${meta}`
            : `${timestamp} ${level}: ${message}${meta}`;
    }));
const baseLogger = (0, winston_1.createLogger)({
    level: LOG_LEVEL,
    format: consoleFormat,
    transports: [
        new winston_1.transports.Console({
            stderrLevels: ["error"],
            handleExceptions: true,
        }),
    ],
    exitOnError: false,
});
const logger = Object.assign(baseLogger, {
    morganStream: {
        write(message) {
            const trimmed = message.trim();
            if (trimmed) {
                baseLogger.info(trimmed);
            }
        },
    },
});
exports.default = logger;
//# sourceMappingURL=logger.util.js.map