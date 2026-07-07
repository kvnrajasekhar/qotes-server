"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const getServiceLogger = (serviceName) => {
  if (!serviceName || typeof serviceName !== "string") {
    throw new Error("serviceName must be a non-empty string");
  }
  return (0, logger_1.createLogger)(serviceName);
};
exports.default = getServiceLogger;
//# sourceMappingURL=loggerFactory.js.map
