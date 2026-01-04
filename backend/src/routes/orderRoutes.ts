import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { CreateOrderSchema, UpdateOrderStatusSchema, Order, OrderStatus, orderStatusFlow } from '../types/order.js';
import { getIO } from '../socket/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// In-memory store for demo (use database in production)
const ordersStore = new Map<string, Order>();

// Get all orders (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), (_req: AuthRequest, res: Response) => {
  const orders = Array.from(ordersStore.values());
  res.json({
    success: true,
    data: orders,
    count: orders.length,
  });
});

// Get orders for current user
router.get('/my-orders', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const orders = Array.from(ordersStore.values()).filter(
    (order) => order.customerId === userId || order.driverId === userId
  );
  
  res.json({
    success: true,
    data: orders,
    count: orders.length,
  });
});

// Get single order
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const order = ordersStore.get(req.params.id);
  
  if (!order) {
    res.status(404).json({
      success: false,
      error: { message: 'Order not found', code: 'NOT_FOUND' },
    });
    return;
  }
  
  // Check authorization
  const user = req.user!;
  if (user.role !== 'admin' && order.customerId !== user.userId && order.driverId !== user.userId) {
    res.status(403).json({
      success: false,
      error: { message: 'Access denied', code: 'FORBIDDEN' },
    });
    return;
  }
  
  res.json({
    success: true,
    data: order,
  });
});

// Create new order
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const validation = CreateOrderSchema.safeParse(req.body);
  
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
  
  const { items, deliveryAddress, notes } = validation.data;
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const order: Order = {
    id: uuidv4(),
    customerId: req.user!.userId,
    status: OrderStatus.PENDING,
    items,
    deliveryAddress,
    totalAmount,
    notes,
    createdAt: new Date(),
    updatedAt: new Date(),
    statusHistory: [
      {
        status: OrderStatus.PENDING,
        timestamp: new Date(),
        updatedBy: req.user!.userId,
      },
    ],
  };
  
  ordersStore.set(order.id, order);
  
  // Emit to admins
  const io = getIO();
  io.to('admin:all-orders').emit('order:created', {
    orderId: order.id,
    customerId: order.customerId,
    status: order.status,
    createdAt: order.createdAt,
  });
  
  logger.info(`Order created: ${order.id}`);
  
  res.status(201).json({
    success: true,
    data: order,
  });
});

// Update order status
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'driver'), (req: AuthRequest, res: Response) => {
  const validation = UpdateOrderStatusSchema.safeParse(req.body);
  
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
  
  const order = ordersStore.get(req.params.id);
  
  if (!order) {
    res.status(404).json({
      success: false,
      error: { message: 'Order not found', code: 'NOT_FOUND' },
    });
    return;
  }
  
  const { status, note, location } = validation.data;
  const allowedTransitions = orderStatusFlow[order.status];
  
  if (!allowedTransitions.includes(status)) {
    res.status(400).json({
      success: false,
      error: {
        message: `Invalid status transition from ${order.status} to ${status}`,
        code: 'INVALID_TRANSITION',
      },
    });
    return;
  }
  
  const previousStatus = order.status;
  order.status = status;
  order.updatedAt = new Date();
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note,
    location,
    updatedBy: req.user!.userId,
  });
  
  // Calculate estimated delivery
  if (status === 'in_transit') {
    order.estimatedDelivery = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  ordersStore.set(order.id, order);
  
  // Emit real-time update
  const io = getIO();
  io.to(`order:${order.id}`).emit('order:status:updated', {
    orderId: order.id,
    status: order.status,
    previousStatus,
    timestamp: new Date(),
    note,
    estimatedDelivery: order.estimatedDelivery,
  });
  
  io.to('admin:all-orders').emit('order:status:updated', {
    orderId: order.id,
    status: order.status,
    previousStatus,
    timestamp: new Date(),
    note,
    estimatedDelivery: order.estimatedDelivery,
  });
  
  logger.info(`Order ${order.id} status updated: ${previousStatus} -> ${status}`);
  
  res.json({
    success: true,
    data: order,
  });
});

// Assign driver to order (admin only)
router.patch('/:id/assign', authenticateToken, authorizeRoles('admin'), (req: AuthRequest, res: Response) => {
  const { driverId, driverName } = req.body;
  
  if (!driverId) {
    res.status(400).json({
      success: false,
      error: { message: 'Driver ID is required', code: 'VALIDATION_ERROR' },
    });
    return;
  }
  
  const order = ordersStore.get(req.params.id);
  
  if (!order) {
    res.status(404).json({
      success: false,
      error: { message: 'Order not found', code: 'NOT_FOUND' },
    });
    return;
  }
  
  order.driverId = driverId;
  order.updatedAt = new Date();
  order.estimatedDelivery = new Date(Date.now() + 45 * 60 * 1000);
  
  ordersStore.set(order.id, order);
  
  // Emit assignment event
  const io = getIO();
  io.to(`order:${order.id}`).emit('order:assigned', {
    orderId: order.id,
    driverId,
    driverName: driverName || 'Driver',
    estimatedDelivery: order.estimatedDelivery,
  });
  
  // Notify the driver
  io.to(`user:${driverId}`).emit('notification', {
    type: 'info',
    title: 'New Order Assigned',
    message: `You have been assigned to order ${order.id}`,
    orderId: order.id,
  });
  
  logger.info(`Order ${order.id} assigned to driver ${driverId}`);
  
  res.json({
    success: true,
    data: order,
  });
});

export { router as orderRoutes };

