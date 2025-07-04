import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { useAuth } from './auth';
import { WebSocketService } from './websocket';

const TerminalContext = createContext();

const terminalReducer = (state, action) => {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, isConnecting: true, isConnected: false, error: null };
    case 'CONNECTED':
      return { 
        ...state, 
        isConnecting: false, 
        isConnected: true, 
        sessionId: action.payload.sessionId,
        error: null 
      };
    case 'DISCONNECTED':
      return { 
        ...state, 
        isConnecting: false, 
        isConnected: false, 
        sessionId: null,
        error: action.payload 
      };
    case 'OUTPUT_RECEIVED':
      return { 
        ...state, 
        output: [...state.output, action.payload],
        lastActivity: new Date()
      };
    case 'CLEAR_OUTPUT':
      return { ...state, output: [] };
    case 'CONNECTION_ERROR':
      return { 
        ...state, 
        isConnecting: false, 
        isConnected: false, 
        error: action.payload 
      };
    default:
      return state;
  }
};

const initialState = {
  isConnecting: false,
  isConnected: false,
  sessionId: null,
  output: [],
  error: null,
  lastActivity: null,
};

export const TerminalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(terminalReducer, initialState);
  const { token, serverUrl, refreshToken } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (token && serverUrl) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, serverUrl]);

  const connect = async () => {
    if (wsRef.current?.isConnected()) {
      return;
    }

    dispatch({ type: 'CONNECTING' });

    try {
      wsRef.current = new WebSocketService(serverUrl, {
        onOpen: handleConnectionOpen,
        onMessage: handleMessage,
        onClose: handleConnectionClose,
        onError: handleConnectionError,
      });

      await wsRef.current.connect(token);
    } catch (error) {
      console.error('Connection error:', error);
      dispatch({ type: 'CONNECTION_ERROR', payload: error.message });
      scheduleReconnect();
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    dispatch({ type: 'DISCONNECTED' });
  };

  const handleConnectionOpen = async () => {
    console.log('WebSocket connected');
    reconnectAttemptsRef.current = 0;

    try {
      const sessionId = await wsRef.current.createSession({
        shell: '/bin/bash',
        cols: 80,
        rows: 24,
      });

      dispatch({ 
        type: 'CONNECTED', 
        payload: { sessionId } 
      });
    } catch (error) {
      console.error('Session creation error:', error);
      dispatch({ type: 'CONNECTION_ERROR', payload: 'Failed to create session' });
    }
  };

  const handleMessage = (message) => {
    switch (message.type) {
      case 'output':
        dispatch({ 
          type: 'OUTPUT_RECEIVED', 
          payload: message.data.output 
        });
        break;
      case 'session':
        if (message.data.action === 'exit') {
          console.log('Terminal session exited');
          scheduleReconnect();
        }
        break;
      case 'error':
        console.error('Terminal error:', message.data);
        dispatch({ 
          type: 'CONNECTION_ERROR', 
          payload: message.data.message 
        });
        break;
    }
  };

  const handleConnectionClose = (event) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    dispatch({ 
      type: 'DISCONNECTED', 
      payload: event.reason || 'Connection closed' 
    });

    if (event.code !== 1000) { // Not a normal closure
      scheduleReconnect();
    }
  };

  const handleConnectionError = (error) => {
    console.error('WebSocket error:', error);
    dispatch({ 
      type: 'CONNECTION_ERROR', 
      payload: 'Connection error' 
    });
    scheduleReconnect();
  };

  const scheduleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    console.log(`Scheduling reconnect in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(async () => {
      reconnectAttemptsRef.current++;
      
      try {
        const newToken = await refreshToken();
        if (newToken) {
          connect();
        }
      } catch (error) {
        console.error('Failed to refresh token for reconnect:', error);
      }
    }, delay);
  };

  const sendCommand = (command) => {
    if (!wsRef.current?.isConnected() || !state.sessionId) {
      console.warn('Cannot send command: not connected or no session');
      return;
    }

    wsRef.current.sendCommand(state.sessionId, command);
  };

  const sendControl = (action, data) => {
    if (!wsRef.current?.isConnected() || !state.sessionId) {
      console.warn('Cannot send control: not connected or no session');
      return;
    }

    wsRef.current.sendControl(state.sessionId, action, data);
  };

  const clearOutput = () => {
    dispatch({ type: 'CLEAR_OUTPUT' });
  };

  const reconnect = () => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  };

  const value = {
    ...state,
    sendCommand,
    sendControl,
    clearOutput,
    reconnect,
    connect,
    disconnect,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
};