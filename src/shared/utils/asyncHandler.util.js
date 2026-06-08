/**
 * Async Handler Utility
 * Wraps async Express route handlers to automatically catch errors
 * and pass them to the Express error handling middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;