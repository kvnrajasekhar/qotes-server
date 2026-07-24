import { Request } from "express";

export interface AuthenticatedUser {
  userId?: string;
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
