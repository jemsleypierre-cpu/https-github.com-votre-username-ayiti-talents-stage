import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  AuthenticatedSocket,
} from '../types/socket.js';
import { JwtPayload } from '../middleware/auth.js';
import { orderSocketHandlers } from './handlers/orderHandlers.js';
import { driverSocketHandlers } from './handlers/driverHandlers.js';

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function initializeSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      socket.data.role = decoded.role;
      socket.data.subscribedOrders = new Set();
      next();
    } catch (error) {
      logger.warn('Socket authentication failed:', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`🔌 Client connected: ${socket.id} (User: ${socket.data.userId}, Role: ${socket.data.role})`);
    
    // Join role-based room
    socket.join(`role:${socket.data.role}`);
    socket.join(`user:${socket.data.userId}`);
    
    // Setup event handlers
    orderSocketHandlers(io, socket);
    driverSocketHandlers(io, socket);
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Client disconnected: ${socket.id} (Reason: ${reason})`);
      
      // Cleanup subscriptions
      socket.data.subscribedOrders.forEach(orderId => {
        socket.leave(`order:${orderId}`);
      });
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('✅ Socket.IO initialized');
  
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

// Utility functions for emitting events
export const socketEmitter = {
  toOrder(orderId: string) {
    return io.to(`order:${orderId}`);
  },
  
  toUser(userId: string) {
    return io.to(`user:${userId}`);
  },
  
  toRole(role: 'user' | 'admin' | 'driver') {
    return io.to(`role:${role}`);
  },
  
  toAll() {
    return io;
  },
};

