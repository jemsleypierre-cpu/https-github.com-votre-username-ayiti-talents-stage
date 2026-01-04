import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Morgan stream for logging
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export function setupMiddleware(app: Application): void {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Compression
  app.use(compression());
  
  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Cookie parser
  app.use(cookieParser());
  
  // Request logging
  app.use(morgan(config.logging.format, { stream }));
  
  // Rate limiting
  app.use('/api/', limiter);
  
  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  
  logger.info('✅ Middleware configured');
}

// Error handling middleware
export function errorHandler(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  
  const status = err.status || 500;
  const message = config.isProduction && status === 500 
    ? 'Internal Server Error' 
    : err.message;
  
  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      ...(config.isDevelopment && { stack: err.stack }),
    },
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
}

