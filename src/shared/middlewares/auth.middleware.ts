import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../interfaces/authenticated-request.interface';

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET || '');
    req.user = typeof decoded === 'string' ? { userId: decoded } : (decoded as AuthenticatedUser);
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired access token' });
  }
};

export default authMiddleware;
