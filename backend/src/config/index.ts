import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('0.0.0.0'),
  
  DATABASE_URL: z.string().url(),
  
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  
  SOCKET_PING_TIMEOUT: z.string().transform(Number).default('60000'),
  SOCKET_PING_INTERVAL: z.string().transform(Number).default('25000'),
  
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
  LOG_FORMAT: z.enum(['dev', 'combined', 'common', 'short', 'tiny']).default('dev'),
  
  API_PREFIX: z.string().default('/api/v1'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = {
  env: parseResult.data.NODE_ENV,
  port: parseResult.data.PORT,
  host: parseResult.data.HOST,
  isProduction: parseResult.data.NODE_ENV === 'production',
  isDevelopment: parseResult.data.NODE_ENV === 'development',
  
  database: {
    url: parseResult.data.DATABASE_URL,
  },
  
  redis: {
    url: parseResult.data.REDIS_URL,
    host: parseResult.data.REDIS_HOST,
    port: parseResult.data.REDIS_PORT,
    password: parseResult.data.REDIS_PASSWORD,
  },
  
  jwt: {
    secret: parseResult.data.JWT_SECRET,
    expiresIn: parseResult.data.JWT_EXPIRES_IN,
    refreshSecret: parseResult.data.JWT_REFRESH_SECRET,
    refreshExpiresIn: parseResult.data.JWT_REFRESH_EXPIRES_IN,
  },
  
  cors: {
    origin: parseResult.data.CORS_ORIGIN,
    allowedOrigins: parseResult.data.ALLOWED_ORIGINS.split(','),
  },
  
  socket: {
    pingTimeout: parseResult.data.SOCKET_PING_TIMEOUT,
    pingInterval: parseResult.data.SOCKET_PING_INTERVAL,
  },
  
  rateLimit: {
    windowMs: parseResult.data.RATE_LIMIT_WINDOW_MS,
    maxRequests: parseResult.data.RATE_LIMIT_MAX_REQUESTS,
  },
  
  logging: {
    level: parseResult.data.LOG_LEVEL,
    format: parseResult.data.LOG_FORMAT,
  },
  
  api: {
    prefix: parseResult.data.API_PREFIX,
  },
} as const;

export type Config = typeof config;



