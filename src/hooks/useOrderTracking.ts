import { useEffect, useState, useCallback, useRef } from 'react';
import socketService, {
  OrderStatusUpdate,
  OrderLocationUpdate,
  Notification,
  AppSocket,
} from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

export interface OrderTrackingState {
  isConnected: boolean;
  currentStatus: string | null;
  driverLocation: { lat: number; lng: number } | null;
  estimatedDelivery: Date | null;
  statusHistory: OrderStatusUpdate[];
  error: string | null;
}

export function useOrderTracking(orderId: string | null, authToken: string | null) {
  const { toast } = useToast();
  const [state, setState] = useState<OrderTrackingState>({
    isConnected: false,
    currentStatus: null,
    driverLocation: null,
    estimatedDelivery: null,
    statusHistory: [],
    error: null,
  });

  const socketRef = useRef<AppSocket | null>(null);

  const handleStatusUpdate = useCallback((data: OrderStatusUpdate) => {
    if (data.orderId !== orderId) return;

    setState((prev) => ({
      ...prev,
      currentStatus: data.status,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : prev.estimatedDelivery,
      statusHistory: [...prev.statusHistory, data],
    }));

    toast({
      title: 'Order Updated',
      description: `Order status changed to: ${data.status}`,
    });
  }, [orderId, toast]);

  const handleLocationUpdate = useCallback((data: OrderLocationUpdate) => {
    if (data.orderId !== orderId) return;

    setState((prev) => ({
      ...prev,
      driverLocation: { lat: data.lat, lng: data.lng },
    }));
  }, [orderId]);

  const handleNotification = useCallback((data: Notification) => {
    toast({
      title: data.title,
      description: data.message,
      variant: data.type === 'error' ? 'destructive' : 'default',
    });
  }, [toast]);

  useEffect(() => {
    if (!authToken || !orderId) {
      setState((prev) => ({ ...prev, isConnected: false, error: 'Missing auth token or order ID' }));
      return;
    }

    // Connect to socket
    const socket = socketService.connect(authToken);
    socketRef.current = socket;

    // Set up event listeners
    socket.on('connect', () => {
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
      socketService.subscribeToOrder(orderId);
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error) => {
      setState((prev) => ({ ...prev, isConnected: false, error: error.message }));
    });

    socketService.onStatusUpdate(handleStatusUpdate);
    socketService.onLocationUpdate(handleLocationUpdate);
    socketService.onNotification(handleNotification);

    // Subscribe to order if already connected
    if (socket.connected) {
      socketService.subscribeToOrder(orderId);
      setState((prev) => ({ ...prev, isConnected: true }));
    }

    // Cleanup
    return () => {
      if (orderId) {
        socketService.unsubscribeFromOrder(orderId);
      }
      socketService.offStatusUpdate(handleStatusUpdate);
      socketService.offLocationUpdate(handleLocationUpdate);
    };
  }, [authToken, orderId, handleStatusUpdate, handleLocationUpdate, handleNotification]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setState({
      isConnected: false,
      currentStatus: null,
      driverLocation: null,
      estimatedDelivery: null,
      statusHistory: [],
      error: null,
    });
  }, []);

  return {
    ...state,
    disconnect,
    socket: socketRef.current,
  };
}

export function useAdminOrderTracking(authToken: string | null) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Map<string, OrderStatusUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const handleStatusUpdate = useCallback((data: OrderStatusUpdate) => {
    setOrders((prev) => new Map(prev).set(data.orderId, data));
  }, []);

  const handleOrderCreated = useCallback((data: { orderId: string; customerId: string; status: string; createdAt: Date }) => {
    toast({
      title: 'New Order',
      description: `Order ${data.orderId.slice(0, 8)}... created`,
    });
  }, [toast]);

  useEffect(() => {
    if (!authToken) return;

    const socket = socketService.connect(authToken);

    socket.on('connect', () => {
      setIsConnected(true);
      socketService.subscribeToAllOrders();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socketService.onStatusUpdate(handleStatusUpdate);
    socketService.onOrderCreated(handleOrderCreated);

    if (socket.connected) {
      socketService.subscribeToAllOrders();
      setIsConnected(true);
    }

    return () => {
      socketService.unsubscribeFromAllOrders();
      socketService.offStatusUpdate(handleStatusUpdate);
    };
  }, [authToken, handleStatusUpdate, handleOrderCreated]);

  return {
    orders: Array.from(orders.values()),
    isConnected,
  };
}

export function useDriverTracking(authToken: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startLocationTracking = useCallback((orderId: string) => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed } = position.coords;
        socketService.updateDriverLocation(
          orderId,
          latitude,
          longitude,
          heading ?? undefined,
          speed ?? undefined
        );
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const updateStatus = useCallback((orderId: string, status: string, note?: string) => {
    socketService.updateOrderStatus(orderId, status, note);
  }, []);

  useEffect(() => {
    if (!authToken) return;

    const socket = socketService.connect(authToken);

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      stopLocationTracking();
    };
  }, [authToken, stopLocationTracking]);

  return {
    isConnected,
    startLocationTracking,
    stopLocationTracking,
    updateStatus,
  };
}



