import { errorResponse } from "../utils/responseFormatter.util";
import { Request, Response, NextFunction } from "express";

const API_KEY_SECRET = process.env.API_KEY_SECRET;

const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
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

export default apiKeyMiddleware;
