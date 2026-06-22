/**
 * Logger Factory - Simplified Module Logger Creation
 *
 * This provides a clean API for creating service/module-specific loggers
 * across the application. Each logger automatically includes the service name.
 *
 * Usage:
 *   const logger = require('./src/shared/logging/loggerFactory')('auth-service');
 *   logger.info('User authenticated', { userId: '123' });
 */

const { createLogger } = require("./logger");

/**
 * Create a module/service-specific logger instance
 *
 * @param {string} serviceName - The name of the service/module
 * @returns {winston.Logger} Configured logger instance
 *
 * @example
 * // In src/modules/auth/auth.service.js
 * const loggerFactory = require('../../shared/logging/loggerFactory');
 * const logger = loggerFactory('auth-service');
 *
 * logger.info('Login attempt', { username: 'user@example.com' });
 * // Output (Production JSON):
 * // {"timestamp":"2025-01-15 10:30:45","level":"info","service":"auth-service","message":"Login attempt","metadata":{"username":"user@example.com"},"traceId":"1234567890-abcd-efgh"}
 */
const getServiceLogger = (serviceName) => {
  if (!serviceName || typeof serviceName !== "string") {
    throw new Error("serviceName must be a non-empty string");
  }
  return createLogger(serviceName);
};

/**
 * Convenience export - use as default export
 */
module.exports = getServiceLogger;
