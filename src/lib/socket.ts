import { io, Socket } from 'socket.io-client';

// Socket.io client configuration for real-time order tracking
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  previousStatus: string;
  timestamp: Date;
  note?: string;
  estimatedDelivery?: Date;
}

export interface OrderLocationUpdate {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface OrderAssignment {
  orderId: string;
  driverId: string;
  driverName: string;
  estimatedDelivery?: Date;
}

export interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  orderId?: string;
}

export interface SocketError {
  code: string;
  message: string;
}

// Server to Client Events
interface ServerToClientEvents {
  'order:status:updated': (data: OrderStatusUpdate) => void;
  'order:location:updated': (data: OrderLocationUpdate) => void;
  'order:created': (data: { orderId: string; customerId: string; status: string; createdAt: Date }) => void;
  'order:assigned': (data: OrderAssignment) => void;
  'notification': (data: Notification) => void;
  'error': (data: SocketError) => void;
}

// Client to Server Events
interface ClientToServerEvents {
  'order:subscribe': (orderId: string) => void;
  'order:unsubscribe': (orderId: string) => void;
  'driver:location:update': (data: { orderId: string; lat: number; lng: number; heading?: number; speed?: number }) => void;
  'driver:status:update': (data: { orderId: string; status: string; note?: string }) => void;
  'admin:orders:subscribe': () => void;
  'admin:orders:unsubscribe': () => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: AppSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(authToken: string): AppSocket {
    if (this.socket?.connected && this.token === authToken) {
      return this.socket;
    }

    this.token = authToken;
    this.disconnect();

    this.socket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventHandlers();

    return this.socket;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('error', (data) => {
      console.error('🔌 Socket error:', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
  }

  getSocket(): AppSocket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Order tracking methods
  subscribeToOrder(orderId: string): void {
    this.socket?.emit('order:subscribe', orderId);
  }

  unsubscribeFromOrder(orderId: string): void {
    this.socket?.emit('order:unsubscribe', orderId);
  }

  // Admin methods
  subscribeToAllOrders(): void {
    this.socket?.emit('admin:orders:subscribe');
  }

  unsubscribeFromAllOrders(): void {
    this.socket?.emit('admin:orders:unsubscribe');
  }

  // Driver methods
  updateDriverLocation(orderId: string, lat: number, lng: number, heading?: number, speed?: number): void {
    this.socket?.emit('driver:location:update', { orderId, lat, lng, heading, speed });
  }

  updateOrderStatus(orderId: string, status: string, note?: string): void {
    this.socket?.emit('driver:status:update', { orderId, status, note });
  }

  // Event listeners
  onStatusUpdate(callback: (data: OrderStatusUpdate) => void): void {
    this.socket?.on('order:status:updated', callback);
  }

  onLocationUpdate(callback: (data: OrderLocationUpdate) => void): void {
    this.socket?.on('order:location:updated', callback);
  }

  onOrderCreated(callback: (data: { orderId: string; customerId: string; status: string; createdAt: Date }) => void): void {
    this.socket?.on('order:created', callback);
  }

  onOrderAssigned(callback: (data: OrderAssignment) => void): void {
    this.socket?.on('order:assigned', callback);
  }

  onNotification(callback: (data: Notification) => void): void {
    this.socket?.on('notification', callback);
  }

  offStatusUpdate(callback?: (data: OrderStatusUpdate) => void): void {
    if (callback) {
      this.socket?.off('order:status:updated', callback);
    } else {
      this.socket?.off('order:status:updated');
    }
  }

  offLocationUpdate(callback?: (data: OrderLocationUpdate) => void): void {
    if (callback) {
      this.socket?.off('order:location:updated', callback);
    } else {
      this.socket?.off('order:location:updated');
    }
  }
}

export const socketService = new SocketService();
export default socketService;



