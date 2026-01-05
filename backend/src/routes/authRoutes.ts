import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { generateToken, generateRefreshToken, authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// In-memory user store for demo (use database in production)
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin' | 'driver';
  createdAt: Date;
}

const usersStore = new Map<string, User>();

// Seed demo users
const seedUsers = async () => {
  const zoePassword = await bcrypt.hash('Zoe2106', 10);
  const defaultPassword = await bcrypt.hash('password123', 10);
  
  const demoUsers: User[] = [
    {
      id: uuidv4(),
      email: 'Zoe1',
      password: zoePassword,
      name: 'Zoe1 Admin',
      role: 'admin',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      email: 'Zoe2',
      password: zoePassword,
      name: 'Zoe2 Admin',
      role: 'admin',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      email: 'Zoe3',
      password: zoePassword,
      name: 'Zoe3 Admin',
      role: 'admin',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      email: 'driver@ayiti.com',
      password: defaultPassword,
      name: 'Driver User',
      role: 'driver',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      email: 'user@ayiti.com',
      password: defaultPassword,
      name: 'Regular User',
      role: 'user',
      createdAt: new Date(),
    },
  ];
  
  demoUsers.forEach(user => usersStore.set(user.email, user));
  logger.info('Demo users seeded');
};
seedUsers();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['user', 'driver']).default('user'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  const validation = RegisterSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors,
      },
    });
    return;
  }
  
  const { email, password, name, role } = validation.data;
  
  if (usersStore.has(email)) {
    res.status(409).json({
      success: false,
      error: { message: 'Email already exists', code: 'CONFLICT' },
    });
    return;
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user: User = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    name,
    role,
    createdAt: new Date(),
  };
  
  usersStore.set(email, user);
  
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });
  
  logger.info(`User registered: ${email}`);
  
  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
    },
  });
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const validation = LoginSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors,
      },
    });
    return;
  }
  
  const { email, password } = validation.data;
  const user = usersStore.get(email);
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' },
    });
    return;
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' },
    });
    return;
  }
  
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });
  
  logger.info(`User logged in: ${email}`);
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
    },
  });
});

// Get current user
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = Array.from(usersStore.values()).find(u => u.id === req.user!.userId);
  
  if (!user) {
    res.status(404).json({
      success: false,
      error: { message: 'User not found', code: 'NOT_FOUND' },
    });
    return;
  }
  
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// Demo credentials endpoint
router.get('/demo-credentials', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Use these credentials for testing',
      users: [
        { email: 'Zoe1', password: 'Zoe2106', role: 'admin' },
        { email: 'Zoe2', password: 'Zoe2106', role: 'admin' },
        { email: 'Zoe3', password: 'Zoe2106', role: 'admin' },
        { email: 'driver@ayiti.com', password: 'password123', role: 'driver' },
        { email: 'user@ayiti.com', password: 'password123', role: 'user' },
      ],
    },
  });
});

export { router as authRoutes };



