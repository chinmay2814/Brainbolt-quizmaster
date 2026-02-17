// ============================================
// BrainBolt - JWT Authentication Middleware
// ============================================

import { Response, NextFunction } from 'express';
import * as jose from 'jose';
import { config } from '../config';
import { AuthenticatedRequest, JWTPayload } from '../types';

const secret = new TextEncoder().encode(config.jwtSecret);

// Generate JWT token
export async function generateToken(payload: JWTPayload): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(config.jwtExpiresIn)
    .setIssuedAt()
    .sign(secret);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Auth middleware - protects routes
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer '
  const payload = await verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  
  req.user = payload;
  next();
}
