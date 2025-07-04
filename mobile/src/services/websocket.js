export class WebSocketService {
  constructor(serverUrl, callbacks = {}) {
    this.serverUrl = serverUrl;
    this.callbacks = callbacks;
    this.ws = null;
    this.isConnecting = false;
    this.messageQueue = [];
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect(token) {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/terminal';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connection opened');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          this.authenticate(token)
            .then(() => {
              this.startHeartbeat();
              this.processMessageQueue();
              this.callbacks.onOpen?.();
              resolve();
            })
            .catch((error) => {
              console.error('Authentication failed:', error);
              reject(error);
            });
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.callbacks.onClose?.(event);
          
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.callbacks.onError?.(error);
          reject(error);
        };

        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Normal closure');
    }
    
    this.ws = null;
    this.messageQueue = [];
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  async authenticate(token) {
    return new Promise((resolve, reject) => {
      const authMessage = {
        type: 'auth',
        data: { token }
      };

      const timeoutId = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      const originalCallback = this.callbacks.onMessage;
      this.callbacks.onMessage = (message) => {
        if (message.type === 'auth') {
          clearTimeout(timeoutId);
          this.callbacks.onMessage = originalCallback;
          
          if (message.data.success) {
            resolve(message.data.user);
          } else {
            reject(new Error('Authentication failed'));
          }
        } else if (originalCallback) {
          originalCallback(message);
        }
      };

      this.sendMessage(authMessage);
    });
  }

  async createSession(options = {}) {
    return new Promise((resolve, reject) => {
      const sessionMessage = {
        type: 'session',
        data: {
          action: 'create',
          ...options
        }
      };

      const timeoutId = setTimeout(() => {
        reject(new Error('Session creation timeout'));
      }, 5000);

      const originalCallback = this.callbacks.onMessage;
      this.callbacks.onMessage = (message) => {
        if (message.type === 'session' && message.data.action === 'created') {
          clearTimeout(timeoutId);
          this.callbacks.onMessage = originalCallback;
          resolve(message.data.sessionId);
        } else if (message.type === 'error') {
          clearTimeout(timeoutId);
          this.callbacks.onMessage = originalCallback;
          reject(new Error(message.data.message));
        } else if (originalCallback) {
          originalCallback(message);
        }
      };

      this.sendMessage(sessionMessage);
    });
  }

  sendCommand(sessionId, command) {
    const message = {
      type: 'command',
      sessionId,
      data: {
        command,
        encoding: 'utf-8'
      }
    };

    this.sendMessage(message);
  }

  sendControl(sessionId, action, data = {}) {
    const message = {
      type: 'control',
      sessionId,
      data: {
        action,
        ...data
      }
    };

    this.sendMessage(message);
  }

  sendMessage(message) {
    if (!this.isConnected()) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.messageQueue.push(message);
    }
  }

  handleMessage(message) {
    this.callbacks.onMessage?.(message);
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.ws.ping?.() || this.sendMessage({ type: 'ping' });
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isConnected()) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }
    }, delay);
  }
}