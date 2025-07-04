const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthManager {
  constructor() {
    this.users = new Map();
    this.refreshTokens = new Map();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.tokenExpiration = '1h';
    this.refreshTokenExpiration = '7d';
    
    this.initializeDefaultUsers();
  }

  initializeDefaultUsers() {
    const defaultUser = {
      id: uuidv4(),
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      created: new Date(),
      lastLogin: null
    };
    
    this.users.set(defaultUser.username, defaultUser);
  }

  async login(username, password) {
    const user = this.users.get(username);
    
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials');
    }

    user.lastLogin = new Date();
    
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.tokenExpiration 
    });
    
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' }, 
      this.jwtSecret, 
      { expiresIn: this.refreshTokenExpiration }
    );

    this.refreshTokens.set(refreshToken, user.id);

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      expires: new Date(Date.now() + 3600000) // 1 hour
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const userId = this.refreshTokens.get(refreshToken);
      if (!userId || userId !== decoded.id) {
        throw new Error('Invalid refresh token');
      }

      const user = Array.from(this.users.values()).find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const payload = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      const newToken = jwt.sign(payload, this.jwtSecret, { 
        expiresIn: this.tokenExpiration 
      });

      return {
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        expires: new Date(Date.now() + 3600000)
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      if (decoded.type === 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = Array.from(this.users.values()).find(u => u.id === decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async logout(refreshToken) {
    if (refreshToken) {
      this.refreshTokens.delete(refreshToken);
    }
  }

  async createUser(username, password, role = 'user') {
    if (this.users.has(username)) {
      throw new Error('User already exists');
    }

    const user = {
      id: uuidv4(),
      username,
      password,
      role,
      created: new Date(),
      lastLogin: null
    };

    this.users.set(username, user);
    
    return {
      id: user.id,
      username: user.username,
      role: user.role
    };
  }

  async deleteUser(username) {
    if (!this.users.has(username)) {
      throw new Error('User not found');
    }

    this.users.delete(username);
  }

  async listUsers() {
    return Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      created: user.created,
      lastLogin: user.lastLogin
    }));
  }

  cleanupExpiredTokens() {
    const now = Date.now();
    
    for (const [refreshToken] of this.refreshTokens) {
      try {
        jwt.verify(refreshToken, this.jwtSecret);
      } catch (error) {
        this.refreshTokens.delete(refreshToken);
      }
    }
  }

  startTokenCleanup() {
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 3600000); // 1 hour
  }
}

function createAuthMiddleware() {
  const authManager = new AuthManager();
  authManager.startTokenCleanup();

  return {
    login: async (req, res) => {
      try {
        const { username, password } = req.body;
        
        if (!username || !password) {
          return res.status(400).json({ 
            error: 'Username and password required' 
          });
        }

        const result = await authManager.login(username, password);
        res.json(result);
      } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: 'Invalid credentials' });
      }
    },

    refresh: async (req, res) => {
      try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
          return res.status(400).json({ 
            error: 'Refresh token required' 
          });
        }

        const result = await authManager.refreshToken(refreshToken);
        res.json(result);
      } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
      }
    },

    authenticate: async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Token required' });
        }

        const token = authHeader.substring(7);
        const user = await authManager.verifyToken(token);
        
        req.user = user;
        next();
      } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid token' });
      }
    },

    verifyToken: async (token) => {
      return await authManager.verifyToken(token);
    },

    createUser: async (req, res) => {
      try {
        const { username, password, role } = req.body;
        
        if (!username || !password) {
          return res.status(400).json({ 
            error: 'Username and password required' 
          });
        }

        const user = await authManager.createUser(username, password, role);
        res.status(201).json(user);
      } catch (error) {
        console.error('User creation error:', error);
        res.status(400).json({ error: error.message });
      }
    },

    logout: async (req, res) => {
      try {
        const { refreshToken } = req.body;
        await authManager.logout(refreshToken);
        res.json({ message: 'Logged out successfully' });
      } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
      }
    }
  };
}

module.exports = { createAuthMiddleware, AuthManager };