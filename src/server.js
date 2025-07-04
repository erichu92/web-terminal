const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { createWebSocketServer } = require('./websocket');
const { createTerminalManager } = require('./terminal');
const { createAuthMiddleware } = require('./auth');
const { createEncodingHandler } = require('./encoding');

class WebTerminalServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = process.env.PORT || 3000;
    this.maxConnections = process.env.MAX_CONNECTIONS || 100;
    
    this.terminalManager = createTerminalManager();
    this.encodingHandler = createEncodingHandler();
    this.authMiddleware = createAuthMiddleware();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupGracefulShutdown();
  }

  setupMiddleware() {
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
  }

  setupWebSocket() {
    this.wss = createWebSocketServer(this.server, {
      maxConnections: this.maxConnections,
      terminalManager: this.terminalManager,
      encodingHandler: this.encodingHandler,
      authMiddleware: this.authMiddleware
    });
  }

  handleHealthCheck(req, res) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      connections: this.terminalManager.getActiveSessionCount(),
      memory: process.memoryUsage(),
      version: require('../package.json').version
    });
  }

  handleGetSessions(req, res) {
    const sessions = this.terminalManager.getSessionsForUser(req.user.id);
    res.json({ sessions });
  }

  handleDeleteSession(req, res) {
    const sessionId = req.params.id;
    const success = this.terminalManager.terminateSession(sessionId, req.user.id);
    
    if (success) {
      res.json({ message: 'Session terminated successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      
      this.server.close(() => {
        console.log('HTTP server closed');
        
        this.terminalManager.closeAllSessions();
        console.log('All terminal sessions closed');
        
        this.wss.close(() => {
          console.log('WebSocket server closed');
          process.exit(0);
        });
      });
      
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`🚀 Web Terminal Server started`);
      console.log(`📍 Port: ${this.port}`);
      console.log(`🌐 Local: http://localhost:${this.port}`);
      console.log(`📱 Terminal: http://localhost:${this.port}/mobile.html`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ Max connections: ${this.maxConnections}`);
    });
  }
}

const server = new WebTerminalServer();
server.start();