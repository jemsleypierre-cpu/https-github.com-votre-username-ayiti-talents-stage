# Ayiti Talents - Order Tracking Backend

Real-time order tracking API built with Express.js and Socket.IO.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis (optional, for scaling)

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Update the `.env` file with your database credentials.

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

### Development

```bash
npm run dev
```

Server will start at `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── config/            # Configuration files
│   │   ├── index.ts       # Environment config
│   │   └── database.ts    # Database connection
│   ├── middleware/        # Express middleware
│   │   ├── index.ts       # Middleware setup
│   │   └── auth.ts        # JWT authentication
│   ├── routes/            # API routes
│   │   ├── index.ts       # Route aggregator
│   │   ├── authRoutes.ts  # Authentication routes
│   │   └── orderRoutes.ts # Order management routes
│   ├── socket/            # Socket.IO handlers
│   │   ├── index.ts       # Socket initialization
│   │   └── handlers/      # Event handlers
│   ├── types/             # TypeScript types
│   │   ├── order.ts       # Order types
│   │   └── socket.ts      # Socket event types
│   ├── utils/             # Utility functions
│   │   └── logger.ts      # Winston logger
│   └── server.ts          # Entry point
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/demo-credentials` - Get demo credentials

### Orders
- `GET /api/v1/orders` - Get all orders (admin)
- `GET /api/v1/orders/my-orders` - Get user's orders
- `GET /api/v1/orders/:id` - Get order by ID
- `POST /api/v1/orders` - Create order
- `PATCH /api/v1/orders/:id/status` - Update order status
- `PATCH /api/v1/orders/:id/assign` - Assign driver (admin)

## 🔌 Socket.IO Events

### Client → Server
- `order:subscribe` - Subscribe to order updates
- `order:unsubscribe` - Unsubscribe from order
- `driver:location:update` - Update driver location
- `driver:status:update` - Update order status
- `admin:orders:subscribe` - Subscribe to all orders
- `admin:orders:unsubscribe` - Unsubscribe from all orders

### Server → Client
- `order:status:updated` - Order status changed
- `order:location:updated` - Driver location updated
- `order:created` - New order created
- `order:assigned` - Driver assigned to order
- `notification` - System notification
- `error` - Error message

## 🧪 Demo Credentials

| Role   | Email              | Password    |
|--------|-------------------|-------------|
| Admin  | admin@ayiti.com   | password123 |
| Driver | driver@ayiti.com  | password123 |
| User   | user@ayiti.com    | password123 |

## 🐳 Docker

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📝 License

MIT

