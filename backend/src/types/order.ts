import { z } from 'zod';

export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

export const orderStatusFlow: Record<OrderStatusType, OrderStatusType[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1),
  deliveryAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('Haiti'),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  notes: z.string().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled',
  ]),
  note: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export interface Order {
  id: string;
  customerId: string;
  driverId?: string;
  status: OrderStatusType;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  totalAmount: number;
  notes?: string;
  estimatedDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
  statusHistory: StatusHistoryEntry[];
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface StatusHistoryEntry {
  status: OrderStatusType;
  timestamp: Date;
  note?: string;
  location?: {
    lat: number;
    lng: number;
  };
  updatedBy?: string;
}

export interface OrderLocation {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}



