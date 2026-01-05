import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';
import { AuthenticatedSocket, ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../types/socket.js';
import { orderStatusFlow, OrderStatusType } from '../../types/order.js';

export function driverSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: AuthenticatedSocket
): void {
  // Driver location update
  socket.on('driver:location:update', (data) => {
    if (socket.data.role !== 'driver') {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Driver access required' });
      return;
    }
    
    const { orderId, lat, lng, heading, speed } = data;
    
    if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') {
      socket.emit('error', { code: 'INVALID_DATA', message: 'Invalid location data' });
      return;
    }
    
    logger.debug(`Driver ${socket.data.userId} location update for order ${orderId}: ${lat}, ${lng}`);
    
    // Broadcast location to order subscribers
    io.to(`order:${orderId}`).emit('order:location:updated', {
      orderId,
      driverId: socket.data.userId,
      lat,
      lng,
      heading,
      speed,
      timestamp: new Date(),
    });
    
    // Also broadcast to admins
    io.to('admin:all-orders').emit('order:location:updated', {
      orderId,
      driverId: socket.data.userId,
      lat,
      lng,
      heading,
      speed,
      timestamp: new Date(),
    });
  });
  
  // Driver status update
  socket.on('driver:status:update', async (data) => {
    if (socket.data.role !== 'driver') {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Driver access required' });
      return;
    }
    
    const { orderId, status, note } = data;
    
    if (!orderId || !status) {
      socket.emit('error', { code: 'INVALID_DATA', message: 'Order ID and status are required' });
      return;
    }
    
    // In production, validate status transition and update database
    logger.info(`Driver ${socket.data.userId} updated order ${orderId} to ${status}`);
    
    // Calculate estimated delivery based on status
    let estimatedDelivery: Date | undefined;
    if (status === 'in_transit') {
      estimatedDelivery = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    }
    
    // Broadcast status update to order subscribers
    io.to(`order:${orderId}`).emit('order:status:updated', {
      orderId,
      status,
      previousStatus: 'picked_up' as OrderStatusType, // In production, get from DB
      timestamp: new Date(),
      note,
      estimatedDelivery,
    });
    
    // Broadcast to admins
    io.to('admin:all-orders').emit('order:status:updated', {
      orderId,
      status,
      previousStatus: 'picked_up' as OrderStatusType,
      timestamp: new Date(),
      note,
      estimatedDelivery,
    });
    
    // Send notification to customer
    socket.emit('notification', {
      type: 'success',
      title: 'Status Updated',
      message: `Order ${orderId} is now ${status}`,
      orderId,
    });
  });
}



