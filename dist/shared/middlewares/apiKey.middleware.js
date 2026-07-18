"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const responseFormatter_util_1 = require("../utils/responseFormatter.util");
const API_KEY_SECRET = process.env.API_KEY_SECRET;
const apiKeyMiddleware = (req, res, next) => {
    if (!API_KEY_SECRET) {
        return (0, responseFormatter_util_1.errorResponse)(res, 500, "API_KEY_SECRET not configured on server");
    }
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
        return (0, responseFormatter_util_1.errorResponse)(res, 401, "Missing X-API-Key header");
    }
    if (apiKey !== API_KEY_SECRET) {
        return (0, responseFormatter_util_1.errorResponse)(res, 403, "Invalid API key");
    }
    next();
};
exports.default = apiKeyMiddleware;
//# sourceMappingURL=apiKey.middleware.js.map