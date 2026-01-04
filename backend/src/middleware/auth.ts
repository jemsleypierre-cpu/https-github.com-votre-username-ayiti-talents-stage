import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'driver';
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Access token required',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token:', error);
    res.status(403).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'FORBIDDEN',
      },
    });
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
      return;
    }
    
    next();
  };
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

