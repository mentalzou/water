import { sign, verify, JwtPayload as BaseJwtPayload } from 'jsonwebtoken';
import { JwtPayload } from '../types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'water-management-secret-key-2024-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload: JwtPayload): string {
  return sign(payload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET);
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}
