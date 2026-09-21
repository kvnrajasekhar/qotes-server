import { Request } from 'express';

export interface AuthenticatedUser {
  userId?: string;
  id?: string;
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
