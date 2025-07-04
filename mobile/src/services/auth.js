import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        serverUrl: action.payload.serverUrl,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        serverUrl: null,
        error: null,
      };
    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  isLoading: false,
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  serverUrl: null,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, refreshToken, user, serverUrl] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('refreshToken'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('serverUrl'),
      ]);

      if (token && refreshToken && user && serverUrl) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            token,
            refreshToken,
            user: JSON.parse(user),
            serverUrl,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    }
  };

  const login = async (serverUrl, username, password) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await fetch(`${serverUrl.replace('ws', 'http')}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      await Promise.all([
        AsyncStorage.setItem('token', data.token),
        AsyncStorage.setItem('refreshToken', data.refreshToken),
        AsyncStorage.setItem('user', JSON.stringify(data.user)),
        AsyncStorage.setItem('serverUrl', serverUrl),
      ]);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token: data.token,
          refreshToken: data.refreshToken,
          user: data.user,
          serverUrl,
        },
      });
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.message || 'Login failed',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (state.refreshToken && state.serverUrl) {
        await fetch(`${state.serverUrl.replace('ws', 'http')}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
          },
          body: JSON.stringify({ refreshToken: state.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    }

    await Promise.all([
      AsyncStorage.removeItem('token'),
      AsyncStorage.removeItem('refreshToken'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('serverUrl'),
    ]);

    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async () => {
    try {
      if (!state.refreshToken || !state.serverUrl) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${state.serverUrl.replace('ws', 'http')}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed');
      }

      await AsyncStorage.setItem('token', data.token);

      dispatch({
        type: 'REFRESH_TOKEN_SUCCESS',
        payload: {
          token: data.token,
          user: data.user,
        },
      });

      return data.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};