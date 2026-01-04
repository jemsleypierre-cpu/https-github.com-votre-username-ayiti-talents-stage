import { Socket } from 'socket.io';
import { OrderStatusType, OrderLocation, StatusHistoryEntry } from './order.js';

// Client to Server Events
export interface ClientToServerEvents {
  // Order tracking
  'order:subscribe': (orderId: string) => void;
  'order:unsubscribe': (orderId: string) => void;
  
  // Driver events
  'driver:location:update': (data: {
    orderId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
  }) => void;
  'driver:status:update': (data: {
    orderId: string;
    status: OrderStatusType;
    note?: string;
  }) => void;
  
  // Admin events
  'admin:orders:subscribe': () => void;
  'admin:orders:unsubscribe': () => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Order updates
  'order:status:updated': (data: {
    orderId: string;
    status: OrderStatusType;
    previousStatus: OrderStatusType;
    timestamp: Date;
    note?: string;
    estimatedDelivery?: Date;
  }) => void;
  
  'order:location:updated': (data: OrderLocation) => void;
  
  'order:created': (data: {
    orderId: string;
    customerId: string;
    status: OrderStatusType;
    createdAt: Date;
  }) => void;
  
  'order:assigned': (data: {
    orderId: string;
    driverId: string;
    driverName: string;
    estimatedDelivery?: Date;
  }) => void;
  
  // Notifications
  'notification': (data: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    orderId?: string;
  }) => void;
  
  // Error events
  'error': (data: {
    code: string;
    message: string;
  }) => void;
}

// Inter-Server Events (for scaling with Redis adapter)
export interface InterServerEvents {
  ping: () => void;
}

// Socket Data
export interface SocketData {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'driver';
  subscribedOrders: Set<string>;
}

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

