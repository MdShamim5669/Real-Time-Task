// JWT Utility placeholder
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export function generateToken(payload: object): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, ENV.JWT_SECRET);
}
