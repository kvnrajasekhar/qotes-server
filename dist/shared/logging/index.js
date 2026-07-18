"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceLogger = exports.loggerFactory = exports.asyncLocalStorage = exports.withTraceId = exports.getTraceId = exports.createLogger = void 0;
const logger_1 = require("./logger");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
Object.defineProperty(exports, "getTraceId", { enumerable: true, get: function () { return logger_1.getTraceId; } });
Object.defineProperty(exports, "withTraceId", { enumerable: true, get: function () { return logger_1.withTraceId; } });
Object.defineProperty(exports, "asyncLocalStorage", { enumerable: true, get: function () { return logger_1.asyncLocalStorage; } });
var loggerFactory_1 = require("./loggerFactory");
Object.defineProperty(exports, "loggerFactory", { enumerable: true, get: function () { return __importDefault(loggerFactory_1).default; } });
var loggerFactory_2 = require("./loggerFactory");
Object.defineProperty(exports, "getServiceLogger", { enumerable: true, get: function () { return __importDefault(loggerFactory_2).default; } });
//# sourceMappingURL=index.js.map