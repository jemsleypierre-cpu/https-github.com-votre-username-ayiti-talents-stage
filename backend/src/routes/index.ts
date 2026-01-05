import { Router } from 'express';
import { orderRoutes } from './orderRoutes.js';
import { authRoutes } from './authRoutes.js';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    name: 'Ayiti Talents Order Tracking API',
    version: '1.0.0',
    description: 'Real-time order tracking with Socket.IO',
    endpoints: {
      auth: '/api/v1/auth',
      orders: '/api/v1/orders',
    },
    websocket: {
      url: 'ws://localhost:3001',
      events: {
        client: [
          'order:subscribe',
          'order:unsubscribe',
          'driver:location:update',
          'driver:status:update',
          'admin:orders:subscribe',
          'admin:orders:unsubscribe',
        ],
        server: [
          'order:status:updated',
          'order:location:updated',
          'order:created',
          'order:assigned',
          'notification',
          'error',
        ],
      },
    },
  });
});

export { router as apiRoutes };



