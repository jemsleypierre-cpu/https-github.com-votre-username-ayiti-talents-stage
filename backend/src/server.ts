import express from 'express';
import { createServer } from 'http';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { setupMiddleware, errorHandler, notFoundHandler } from './middleware/index.js';
import { initializeSocketIO } from './socket/index.js';
import { apiRoutes } from './routes/index.js';

async function bootstrap(): Promise<void> {
  const app = express();
  const httpServer = createServer(app);
  
  // Setup middleware
  setupMiddleware(app);
  
  // Initialize Socket.IO
  initializeSocketIO(httpServer);
  
  // API Routes
  app.use(config.api.prefix, apiRoutes);
  
  // Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  // Start server
  httpServer.listen(config.port, config.host, () => {
    logger.info(`
🚀 Server is running!
📡 REST API: http://${config.host}:${config.port}${config.api.prefix}
🔌 WebSocket: ws://${config.host}:${config.port}
🌍 Environment: ${config.env}
    `);
  });
  
  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`${signal} received, shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

