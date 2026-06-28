import { Request, Response, NextFunction } from "express";

/**
 * Async Handler Utility
 * Wraps async Express route handlers to automatically catch errors
 * and pass them to the Express error handling middleware.
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
