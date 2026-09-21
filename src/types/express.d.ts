declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: string;
        id?: string;
        _id?: string;
        username?: string;
        email?: string;
        role?: string;
      };
      file?: Express.Multer.File;
      files?: Record<string, Express.Multer.File[]> | Express.Multer.File[];
      cookies?: Record<string, string>;
      traceId?: string;
      correlationId?: string;
      app?: unknown;
    }
  }
}

export { };
