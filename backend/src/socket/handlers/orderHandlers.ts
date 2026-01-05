import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';
import { AuthenticatedSocket, ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../types/socket.js';

export function orderSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: AuthenticatedSocket
): void {
  // Subscribe to order updates
  socket.on('order:subscribe', (orderId: string) => {
    if (!orderId) {
      socket.emit('error', { code: 'INVALID_ORDER_ID', message: 'Order ID is required' });
      return;
    }
    
    // Validate that user can subscribe to this order (ownership check in production)
    logger.info(`User ${socket.data.userId} subscribed to order ${orderId}`);
    
    socket.join(`order:${orderId}`);
    socket.data.subscribedOrders.add(orderId);
    
    // Send confirmation
    socket.emit('notification', {
      type: 'info',
      title: 'Tracking Active',
      message: `Now tracking order ${orderId}`,
      orderId,
    });
  });
  
  // Unsubscribe from order updates
  socket.on('order:unsubscribe', (orderId: string) => {
    logger.info(`User ${socket.data.userId} unsubscribed from order ${orderId}`);
    
    socket.leave(`order:${orderId}`);
    socket.data.subscribedOrders.delete(orderId);
  });
  
  // Admin: Subscribe to all orders
  socket.on('admin:orders:subscribe', () => {
    if (socket.data.role !== 'admin') {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Admin access required' });
      return;
    }
    
    logger.info(`Admin ${socket.data.userId} subscribed to all orders`);
    socket.join('admin:all-orders');
  });
  
  // Admin: Unsubscribe from all orders
  socket.on('admin:orders:unsubscribe', () => {
    logger.info(`Admin ${socket.data.userId} unsubscribed from all orders`);
    socket.leave('admin:all-orders');
  });
}



