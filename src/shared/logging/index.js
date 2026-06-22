/**
 * Logging Module Barrel Export
 *
 * Provides clean, unified imports for the entire logging system
 *
 * Usage:
 *   const { loggerFactory, requestLoggerMiddleware } = require('./src/shared/logging');
 */

const {
  createLogger,
  getTraceId,
  withTraceId,
  asyncLocalStorage,
} = require("./logger");
const {
  requestLoggerMiddleware,
  asyncRequestLoggerMiddleware,
  setCorrelationId,
} = require("./requestLogger");
const loggerFactory = require("./loggerFactory");

module.exports = {
  // Core logger functions
  createLogger,
  loggerFactory,
  getTraceId,
  withTraceId,
  asyncLocalStorage,

  // Middleware
  requestLoggerMiddleware,
  asyncRequestLoggerMiddleware,
  setCorrelationId,
};
