const pty = require('node-pty');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class TerminalManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.userSessions = new Map();
  }

  async createSession(userId, options = {}) {
    const sessionId = uuidv4();
    const {
      shell = process.platform === 'win32' ? 'powershell.exe' : 'bash',
      cwd = process.env.HOME || process.cwd(),
      cols = 80,
      rows = 24,
      env = process.env
    } = options;

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          TERM: 'dumb',
          COLORTERM: '',
          FORCE_COLOR: '0',
          NO_COLOR: '1'
        },
        handleFlowControl: false,
        experimentalUseConpty: false
      });

      // 터미널 시작 시 초기화 명령 전송
      setTimeout(() => {
        ptyProcess.write('\r');
      }, 100);

      const session = {
        id: sessionId,
        userId,
        ptyProcess,
        shell,
        cwd,
        cols,
        rows,
        created: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      this.sessions.set(sessionId, session);
      
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId).add(sessionId);

      ptyProcess.onData((data) => {
        session.lastActivity = new Date();
        // 모든 출력을 그대로 전송 (버퍼링 없이)
        this.emit('output', sessionId, data);
        
        // 디버깅을 위한 로그
        if (data.length > 0) {
          console.log(`Session ${sessionId} output:`, data.toString().replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
        }
      });

      ptyProcess.onExit((code, signal) => {
        console.log(`Terminal session ${sessionId} exited with code ${code}, signal ${signal}`);
        session.isActive = false;
        this.emit('exit', sessionId, code, signal);
        
        // Claude 세션이 타임아웃으로 종료된 경우 재시작하지 않음
        if (code === 124) {
          console.log(`Session ${sessionId} timed out, not restarting`);
          this.cleanupSession(sessionId);
        } else if (code !== 0 && signal !== 'SIGTERM') {
          console.log(`Attempting to restart session ${sessionId}`);
          setTimeout(() => {
            this.cleanupSession(sessionId);
          }, 1000);
        } else {
          this.cleanupSession(sessionId);
        }
      });

      console.log(`Created terminal session ${sessionId} for user ${userId}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to create terminal session:', error);
      throw new Error('Failed to create terminal session');
    }
  }

  writeToSession(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    session.ptyProcess.write(data);
    session.lastActivity = new Date();
  }

  resizeSession(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    session.ptyProcess.resize(cols, rows);
    session.cols = cols;
    session.rows = rows;
    session.lastActivity = new Date();
  }

  sendSignal(sessionId, signal) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    session.ptyProcess.kill(signal);
  }

  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.isActive) {
      session.ptyProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (session.isActive) {
          session.ptyProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    this.cleanupSession(sessionId);
    return true;
  }

  terminateSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return false;
    }

    return this.closeSession(sessionId);
  }

  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    this.sessions.delete(sessionId);
    console.log(`Cleaned up session ${sessionId}`);
  }

  getSessionsForUser(userId) {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      return [];
    }

    return Array.from(userSessions).map(sessionId => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return null;
      }

      return {
        id: session.id,
        shell: session.shell,
        cwd: session.cwd,
        cols: session.cols,
        rows: session.rows,
        created: session.created,
        lastActivity: session.lastActivity,
        isActive: session.isActive
      };
    }).filter(Boolean);
  }

  getActiveSessionCount() {
    return this.sessions.size;
  }

  closeAllSessions() {
    const sessionIds = Array.from(this.sessions.keys());
    sessionIds.forEach(sessionId => this.closeSession(sessionId));
  }

  onSessionOutput(sessionId, callback) {
    this.on('output', (id, data) => {
      if (id === sessionId) {
        callback(data);
      }
    });
  }

  onSessionError(sessionId, callback) {
    this.on('error', (id, error) => {
      if (id === sessionId) {
        callback(error);
      }
    });
  }

  onSessionExit(sessionId, callback) {
    this.on('exit', (id, code, signal) => {
      if (id === sessionId) {
        callback(code, signal);
      }
    });
  }

  startSessionCleanup() {
    const CLEANUP_INTERVAL = 60000; // 1분
    const SESSION_TIMEOUT = 3600000; // 1시간

    setInterval(() => {
      const now = new Date();
      const sessionsToCleanup = [];

      for (const [sessionId, session] of this.sessions) {
        if (!session.isActive) {
          continue;
        }

        const inactiveTime = now - session.lastActivity;
        if (inactiveTime > SESSION_TIMEOUT) {
          sessionsToCleanup.push(sessionId);
        }
      }

      sessionsToCleanup.forEach(sessionId => {
        console.log(`Cleaning up inactive session: ${sessionId}`);
        this.closeSession(sessionId);
      });
    }, CLEANUP_INTERVAL);
  }
}

function createTerminalManager() {
  const manager = new TerminalManager();
  manager.startSessionCleanup();
  return manager;
}

module.exports = { createTerminalManager, TerminalManager };