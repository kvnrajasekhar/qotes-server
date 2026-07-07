"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = exports.successResponse = void 0;
const successResponse = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    statusCode: statusCode,
    message: message,
    data: data,
  });
};
exports.successResponse = successResponse;
const errorResponse = (res, statusCode, message, errors = []) => {
  return res.status(statusCode).json({
    success: false,
    statusCode: statusCode,
    message: message,
    errors: errors,
  });
};
exports.errorResponse = errorResponse;
//# sourceMappingURL=responseFormatter.util.js.map
