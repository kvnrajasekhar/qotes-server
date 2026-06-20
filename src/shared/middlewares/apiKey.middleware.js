const { errorResponse } = require("../utils/responseFormatter.util");

const API_KEY_SECRET = process.env.API_KEY_SECRET;

/**
 * Middleware to validate API key for private/admin routes
 * Expected header: X-API-Key: <api-key>
 */
const apiKeyMiddleware = (req, res, next) => {
  if (!API_KEY_SECRET) {
    return errorResponse(res, 500, "API_KEY_SECRET not configured on server");
  }

  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return errorResponse(res, 401, "Missing X-API-Key header");
  }

  if (apiKey !== API_KEY_SECRET) {
    return errorResponse(res, 403, "Invalid API key");
  }

  next();
};

module.exports = apiKeyMiddleware;
