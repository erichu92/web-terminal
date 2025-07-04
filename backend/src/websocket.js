const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

function createWebSocketServer(server, options) {
  const { maxConnections, terminalManager, encodingHandler, authMiddleware } = options;
  
  const wss = new WebSocket.Server({ 
    server,
    path: '/terminal',
    verifyClient: (info) => {
      if (wss.clients.size >= maxConnections) {
        console.log('Max connections reached, rejecting new connection');
        return false;
      }
      return true;
    },
    // WebSocket 타임아웃 설정
    handshakeTimeout: 30000,
    clientTracking: true
  });

  wss.on('connection', (ws, req) => {
    let sessionId = null;
    let userId = null;
    let isAuthenticated = false;
    
    console.log('New WebSocket connection established');
    
    ws.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 10000); // 10초마다 핑

    // 연결 상태 모니터링
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'auth':
            await handleAuthentication(ws, data, authMiddleware);
            break;
            
          case 'session':
            if (!isAuthenticated) {
              sendError(ws, 'AUTH_REQUIRED', 'Authentication required');
              return;
            }
            await handleSessionManagement(ws, data, terminalManager, userId);
            break;
            
          case 'command':
            if (!isAuthenticated || !sessionId) {
              sendError(ws, 'SESSION_REQUIRED', 'Active session required');
              return;
            }
            await handleCommand(ws, data, terminalManager, encodingHandler, sessionId);
            break;
            
          case 'ping':
            // Keep-alive ping 응답
            sendMessage(ws, {
              type: 'pong',
              data: { timestamp: Date.now() }
            });
            break;
            
          case 'control':
            if (!isAuthenticated || !sessionId) {
              sendError(ws, 'SESSION_REQUIRED', 'Active session required');
              return;
            }
            await handleControl(ws, data, terminalManager, sessionId);
            break;
            
          default:
            sendError(ws, 'INVALID_MESSAGE_TYPE', `Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed: ${code} ${reason}`);
      
      if (ws.pingInterval) {
        clearInterval(ws.pingInterval);
      }
      
      if (sessionId) {
        terminalManager.closeSession(sessionId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    async function handleAuthentication(ws, data, authMiddleware) {
      try {
        const token = data.data?.token;
        if (!token) {
          sendError(ws, 'AUTH_FAILED', 'Token required');
          return;
        }

        const user = await authMiddleware.verifyToken(token);
        if (!user) {
          sendError(ws, 'AUTH_FAILED', 'Invalid token');
          return;
        }

        userId = user.id;
        isAuthenticated = true;
        
        sendMessage(ws, {
          type: 'auth',
          data: {
            success: true,
            user: { id: user.id, username: user.username }
          }
        });
        
        console.log(`User ${user.username} authenticated successfully`);
      } catch (error) {
        console.error('Authentication error:', error);
        sendError(ws, 'AUTH_FAILED', 'Authentication failed');
      }
    }

    async function handleSessionManagement(ws, data, terminalManager, userId) {
      const action = data.data?.action;
      
      switch (action) {
        case 'create':
          try {
            const newSessionId = await terminalManager.createSession(userId, {
              shell: data.data?.shell || '/bin/bash',
              cwd: data.data?.cwd || process.cwd(),
              cols: data.data?.cols || 80,
              rows: data.data?.rows || 24
            });
            
            sessionId = newSessionId;
            
            terminalManager.onSessionOutput(sessionId, (output, encoding) => {
              // 출력을 그대로 전송 (디코딩하지 않음)
              const outputData = Buffer.isBuffer(output) ? output.toString('utf-8') : output;
              
              sendMessage(ws, {
                type: 'output',
                sessionId,
                data: {
                  output: outputData,
                  encoding: 'utf-8',
                  isError: false
                }
              });
              
              // 디버깅 로그
              console.log(`Sending output to client:`, outputData.replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
            });
            
            terminalManager.onSessionError(sessionId, (error) => {
              sendMessage(ws, {
                type: 'output',
                sessionId,
                data: {
                  output: error.toString(),
                  encoding: 'utf-8',
                  isError: true
                }
              });
            });
            
            terminalManager.onSessionExit(sessionId, (code, signal) => {
              sendMessage(ws, {
                type: 'session',
                sessionId,
                data: {
                  action: 'exit',
                  code,
                  signal
                }
              });
            });
            
            sendMessage(ws, {
              type: 'session',
              data: {
                action: 'created',
                sessionId,
                shell: data.data?.shell || '/bin/bash'
              }
            });
            
            console.log(`New session created: ${sessionId} for user ${userId}`);
          } catch (error) {
            console.error('Session creation error:', error);
            sendError(ws, 'SESSION_CREATE_FAILED', 'Failed to create session');
          }
          break;
          
        case 'close':
          if (sessionId) {
            terminalManager.closeSession(sessionId);
            sessionId = null;
            sendMessage(ws, {
              type: 'session',
              data: { action: 'closed' }
            });
          }
          break;
          
        default:
          sendError(ws, 'INVALID_ACTION', `Unknown session action: ${action}`);
      }
    }

    async function handleCommand(ws, data, terminalManager, encodingHandler, sessionId) {
      try {
        const command = data.data?.command;
        const encoding = data.data?.encoding || 'utf-8';
        
        if (command === undefined || command === null) {
          sendError(ws, 'INVALID_COMMAND', 'Command required');
          return;
        }
        
        // Raw 데이터를 그대로 전송 (인코딩 처리 안함)
        terminalManager.writeToSession(sessionId, command);
        
      } catch (error) {
        console.error('Command execution error:', error);
        sendError(ws, 'COMMAND_FAILED', 'Command execution failed');
      }
    }

    async function handleControl(ws, data, terminalManager, sessionId) {
      try {
        const action = data.data?.action;
        
        switch (action) {
          case 'resize':
            const cols = data.data?.cols || 80;
            const rows = data.data?.rows || 24;
            terminalManager.resizeSession(sessionId, cols, rows);
            break;
            
          case 'signal':
            const signal = data.data?.signal;
            if (signal) {
              terminalManager.sendSignal(sessionId, signal);
            }
            break;
            
          default:
            sendError(ws, 'INVALID_CONTROL', `Unknown control action: ${action}`);
        }
      } catch (error) {
        console.error('Control action error:', error);
        sendError(ws, 'CONTROL_FAILED', 'Control action failed');
      }
    }
  });

  return wss;
}

function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    }));
  }
}

function sendError(ws, code, message) {
  sendMessage(ws, {
    type: 'error',
    data: {
      code,
      message
    }
  });
}

module.exports = { createWebSocketServer };