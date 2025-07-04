const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { createWebSocketServer } = require('./websocket');
const { createTerminalManager } = require('./terminal');
const { createAuthMiddleware } = require('./auth');
const { createEncodingHandler } = require('./encoding');
const { createLogger } = require('./logger');

class WebTerminalServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = process.env.PORT || 3000;
    this.maxConnections = process.env.MAX_CONNECTIONS || 100;
    this.logger = createLogger();
    
    this.terminalManager = createTerminalManager();
    this.encodingHandler = createEncodingHandler();
    this.authMiddleware = createAuthMiddleware();
    
    this.logger.info('Initializing Web Terminal Server', {
      port: this.port,
      maxConnections: this.maxConnections,
      nodeVersion: process.version
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupGracefulShutdown();
  }

  setupMiddleware() {
    // Request logging middleware
    this.app.use((req, res, next) => {
      this.logger.debug('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
      next();
    });

    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRoutes() {
    this.app.get('/health', this.handleHealthCheck.bind(this));
    this.app.post('/api/auth/login', this.authMiddleware.login);
    this.app.post('/api/auth/refresh', this.authMiddleware.refresh);
    this.app.get('/api/sessions', this.authMiddleware.authenticate, this.handleGetSessions.bind(this));
    this.app.delete('/api/sessions/:id', this.authMiddleware.authenticate, this.handleDeleteSession.bind(this));
    
    // Admin routes for logs
    this.app.get('/api/admin/logs/:level?', this.authMiddleware.authenticate, this.handleGetLogs.bind(this));
    this.app.get('/api/admin/logs-stats', this.authMiddleware.authenticate, this.handleGetLogStats.bind(this));
  }

  setupWebSocket() {
    this.wss = createWebSocketServer(this.server, {
      maxConnections: this.maxConnections,
      terminalManager: this.terminalManager,
      encodingHandler: this.encodingHandler,
      authMiddleware: this.authMiddleware,
      logger: this.logger
    });
  }

  handleHealthCheck(req, res) {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      connections: this.terminalManager.getActiveSessionCount(),
      memory: process.memoryUsage(),
      version: require('../package.json').version
    };
    
    this.logger.debug('Health check requested', {
      requestedBy: req.ip || req.connection.remoteAddress
    });
    
    res.json(healthData);
  }

  handleGetSessions(req, res) {
    const sessions = this.terminalManager.getSessionsForUser(req.user.id);
    
    this.logger.debug('Sessions requested', {
      userId: req.user.id,
      sessionCount: sessions.length
    });
    
    res.json({ sessions });
  }

  handleDeleteSession(req, res) {
    const sessionId = req.params.id;
    const success = this.terminalManager.terminateSession(sessionId, req.user.id);
    
    this.logger.info('Session termination requested', {
      sessionId,
      userId: req.user.id,
      success
    });
    
    if (success) {
      res.json({ message: 'Session terminated successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  }

  handleGetLogs(req, res) {
    // Only allow admin users to access logs
    if (req.user.role !== 'admin') {
      this.logger.securityEvent('Unauthorized log access attempt', {
        userId: req.user.id,
        username: req.user.username,
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    const level = req.params.level || 'combined';
    const lines = parseInt(req.query.lines) || 100;
    
    try {
      const logs = this.logger.getRecentLogs(level, lines);
      
      this.logger.info('Logs accessed via API', {
        userId: req.user.id,
        level,
        lines: logs.length
      });
      
      res.json({ logs, level, count: logs.length });
    } catch (error) {
      this.logger.errorWithStack(error, 'Failed to retrieve logs');
      res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  }

  handleGetLogStats(req, res) {
    // Only allow admin users to access log stats
    if (req.user.role !== 'admin') {
      this.logger.securityEvent('Unauthorized log stats access attempt', {
        userId: req.user.id,
        username: req.user.username,
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const stats = this.logger.getLogStats();
      
      this.logger.debug('Log stats accessed via API', {
        userId: req.user.id
      });
      
      res.json({ stats });
    } catch (error) {
      this.logger.errorWithStack(error, 'Failed to retrieve log stats');
      res.status(500).json({ error: 'Failed to retrieve log stats' });
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      this.logger.warn(`Received ${signal}. Starting graceful shutdown...`);
      
      this.server.close(() => {
        this.logger.info('HTTP server closed');
        
        this.terminalManager.closeAllSessions();
        this.logger.info('All terminal sessions closed');
        
        this.wss.close(() => {
          this.logger.info('WebSocket server closed');
          process.exit(0);
        });
      });
      
      setTimeout(() => {
        this.logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      this.logger.errorWithStack(error, 'Uncaught Exception');
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', {
        reason: reason.toString(),
        promise: promise.toString()
      });
      gracefulShutdown('unhandledRejection');
    });
  }

  start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      const startupInfo = {
        port: this.port,
        environment: process.env.NODE_ENV || 'development',
        maxConnections: this.maxConnections,
        pid: process.pid
      };

      this.logger.info('Web Terminal Server started successfully', startupInfo);
      
      console.log(`🚀 Web Terminal Server started`);
      console.log(`📍 Port: ${this.port}`);
      console.log(`🌐 Local: http://localhost:${this.port}`);
      console.log(`📱 Mobile Terminal ready!`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ Max connections: ${this.maxConnections}`);
      console.log(`📊 Logs directory: logs/`);
      console.log(`\n💡 ngrok 사용법: ngrok http ${this.port}`);
    });
  }
}

const server = new WebTerminalServer();
server.start();