const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { createWebSocketServer } = require('./websocket');
const { createTerminalManager } = require('./terminal');
const { createAuthMiddleware } = require('./auth');
const { createEncodingHandler } = require('./encoding');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const MAX_CONNECTIONS = process.env.MAX_CONNECTIONS || 100;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const terminalManager = createTerminalManager();
const encodingHandler = createEncodingHandler();
const authMiddleware = createAuthMiddleware();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: terminalManager.getActiveSessionCount(),
    memory: process.memoryUsage(),
    version: require('../package.json').version
  });
});

app.post('/api/auth/login', authMiddleware.login);
app.post('/api/auth/refresh', authMiddleware.refresh);

app.get('/api/sessions', authMiddleware.authenticate, (req, res) => {
  const sessions = terminalManager.getSessionsForUser(req.user.id);
  res.json({ sessions });
});

app.delete('/api/sessions/:id', authMiddleware.authenticate, (req, res) => {
  const sessionId = req.params.id;
  const success = terminalManager.terminateSession(sessionId, req.user.id);
  
  if (success) {
    res.json({ message: 'Session terminated successfully' });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

const wss = createWebSocketServer(server, {
  maxConnections: MAX_CONNECTIONS,
  terminalManager,
  encodingHandler,
  authMiddleware
});

const connections = new Set();

wss.on('connection', (ws) => {
  connections.add(ws);
  console.log(`New WebSocket connection. Total: ${connections.size}`);
  
  ws.on('close', () => {
    connections.delete(ws);
    console.log(`WebSocket connection closed. Total: ${connections.size}`);
  });
});

const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    terminalManager.closeAllSessions();
    console.log('All terminal sessions closed');
    
    wss.close(() => {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.45.8:${PORT}`);
  console.log(`Mobile terminal: http://192.168.45.8:${PORT}/mobile.html`);
  console.log(`WebSocket server ready`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Max connections: ${MAX_CONNECTIONS}`);
});