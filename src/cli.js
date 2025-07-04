#!/usr/bin/env node

const readline = require('readline');
const { AuthManager } = require('./auth');
const { getLogger } = require('./logger');

class WebTerminalCLI {
  constructor() {
    this.authManager = new AuthManager();
    this.logger = getLogger();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'web-terminal> '
    });
    
    this.commands = {
      help: this.showHelp.bind(this),
      'user:list': this.listUsers.bind(this),
      'user:create': this.createUser.bind(this),
      'user:delete': this.deleteUser.bind(this),
      'user:password': this.changePassword.bind(this),
      'logs:recent': this.showRecentLogs.bind(this),
      'logs:stats': this.showLogStats.bind(this),
      'logs:tail': this.tailLogs.bind(this),
      'server:info': this.showServerInfo.bind(this),
      exit: this.exit.bind(this),
      quit: this.exit.bind(this)
    };
  }

  start() {
    console.log('🚀 웹 터미널 서버 관리 도구');
    console.log('도움말을 보려면 "help"를 입력하세요.');
    console.log('');
    
    this.rl.prompt();
    
    this.rl.on('line', (line) => {
      this.processCommand(line.trim());
    });

    this.rl.on('close', () => {
      console.log('\n안녕히 가세요!');
      process.exit(0);
    });
  }

  async processCommand(input) {
    if (!input) {
      this.rl.prompt();
      return;
    }

    const [command, ...args] = input.split(' ');
    
    if (this.commands[command]) {
      try {
        await this.commands[command](args);
      } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
        this.logger.error('CLI command error', { command, args, error: error.message });
      }
    } else {
      console.log(`❌ 알 수 없는 명령어: ${command}`);
      console.log('사용 가능한 명령어를 보려면 "help"를 입력하세요.');
    }
    
    this.rl.prompt();
  }

  showHelp() {
    console.log('\n📋 사용 가능한 명령어:');
    console.log('');
    console.log('👥 사용자 관리:');
    console.log('  user:list                    - 사용자 목록 보기');
    console.log('  user:create <username> <password> [role] - 새 사용자 생성');
    console.log('  user:delete <username>       - 사용자 삭제');
    console.log('  user:password <username> <new_password> - 비밀번호 변경');
    console.log('');
    console.log('📊 로그 관리:');
    console.log('  logs:recent [level] [lines]  - 최근 로그 보기 (기본: combined, 100줄)');
    console.log('  logs:stats                   - 로그 파일 통계');
    console.log('  logs:tail [level]            - 실시간 로그 보기');
    console.log('');
    console.log('🔧 서버 정보:');
    console.log('  server:info                  - 서버 상태 정보');
    console.log('');
    console.log('🚪 기타:');
    console.log('  help                         - 이 도움말 보기');
    console.log('  exit, quit                   - 종료');
    console.log('');
  }

  async listUsers() {
    const users = await this.authManager.listUsers();
    
    console.log('\n👥 등록된 사용자:');
    console.log('┌────────────────┬──────────┬─────────────────────┬─────────────────────┐');
    console.log('│ 사용자명       │ 역할     │ 생성일              │ 마지막 로그인       │');
    console.log('├────────────────┼──────────┼─────────────────────┼─────────────────────┤');
    
    users.forEach(user => {
      const username = user.username.padEnd(14);
      const role = user.role.padEnd(8);
      const created = user.created.toISOString().substring(0, 19);
      const lastLogin = user.lastLogin ? user.lastLogin.toISOString().substring(0, 19) : '없음';
      
      console.log(`│ ${username} │ ${role} │ ${created} │ ${lastLogin.padEnd(19)} │`);
    });
    
    console.log('└────────────────┴──────────┴─────────────────────┴─────────────────────┘');
    console.log(`총 ${users.length}명의 사용자`);
  }

  async createUser(args) {
    if (args.length < 2) {
      console.log('❌ 사용법: user:create <username> <password> [role]');
      return;
    }

    const [username, password, role = 'user'] = args;
    
    try {
      const user = await this.authManager.createUser(username, password, role);
      console.log(`✅ 사용자 '${username}' 생성 완료 (역할: ${role})`);
      this.logger.info('User created via CLI', { username, role, creator: 'cli' });
    } catch (error) {
      console.log(`❌ 사용자 생성 실패: ${error.message}`);
    }
  }

  async deleteUser(args) {
    if (args.length < 1) {
      console.log('❌ 사용법: user:delete <username>');
      return;
    }

    const [username] = args;
    
    if (username === 'admin') {
      console.log('❌ 기본 관리자 계정은 삭제할 수 없습니다.');
      return;
    }

    try {
      await this.authManager.deleteUser(username);
      console.log(`✅ 사용자 '${username}' 삭제 완료`);
      this.logger.warn('User deleted via CLI', { username, deletedBy: 'cli' });
    } catch (error) {
      console.log(`❌ 사용자 삭제 실패: ${error.message}`);
    }
  }

  async changePassword(args) {
    if (args.length < 2) {
      console.log('❌ 사용법: user:password <username> <new_password>');
      return;
    }

    const [username, newPassword] = args;
    
    try {
      // Get user first
      const users = await this.authManager.listUsers();
      const user = users.find(u => u.username === username);
      
      if (!user) {
        console.log(`❌ 사용자 '${username}'을(를) 찾을 수 없습니다.`);
        return;
      }

      // Delete and recreate user with new password
      const role = user.role;
      await this.authManager.deleteUser(username);
      await this.authManager.createUser(username, newPassword, role);
      
      console.log(`✅ 사용자 '${username}'의 비밀번호 변경 완료`);
      this.logger.warn('Password changed via CLI', { username, changedBy: 'cli' });
    } catch (error) {
      console.log(`❌ 비밀번호 변경 실패: ${error.message}`);
    }
  }

  showRecentLogs(args) {
    const [level = 'combined', lines = '100'] = args;
    const numLines = parseInt(lines) || 100;
    
    console.log(`\n📊 최근 ${numLines}줄의 ${level} 로그:`);
    console.log('─'.repeat(80));
    
    const logs = this.logger.getRecentLogs(level, numLines);
    
    if (logs.length === 0) {
      console.log('로그가 없습니다.');
      return;
    }

    logs.forEach(log => {
      if (log.raw) {
        console.log(log.raw);
      } else {
        const time = log.timestamp ? log.timestamp.substring(11, 19) : 'N/A';
        const levelStr = log.level ? `[${log.level}]`.padEnd(7) : '[N/A]  ';
        console.log(`${time} ${levelStr} ${log.message}`);
        
        if (log.meta && Object.keys(log.meta).length > 0) {
          console.log(`       Meta: ${JSON.stringify(log.meta)}`);
        }
      }
    });
  }

  showLogStats() {
    const stats = this.logger.getLogStats();
    
    console.log('\n📈 로그 파일 통계:');
    console.log('┌─────────────┬──────────┬─────────────────────┬────────────┐');
    console.log('│ 레벨        │ 크기     │ 마지막 수정         │ 상태       │');
    console.log('├─────────────┼──────────┼─────────────────────┼────────────┤');
    
    Object.entries(stats).forEach(([level, stat]) => {
      const levelStr = level.padEnd(11);
      const size = stat.exists ? this.formatBytes(stat.size).padEnd(8) : 'N/A'.padEnd(8);
      const lastMod = stat.exists ? stat.lastModified.toISOString().substring(0, 19) : 'N/A'.padEnd(19);
      const status = stat.exists ? '존재'.padEnd(10) : '없음'.padEnd(10);
      
      console.log(`│ ${levelStr} │ ${size} │ ${lastMod} │ ${status} │`);
    });
    
    console.log('└─────────────┴──────────┴─────────────────────┴────────────┘');
  }

  tailLogs(args) {
    const [level = 'combined'] = args;
    console.log(`\n📡 실시간 ${level} 로그 (Ctrl+C로 중단):`);
    console.log('─'.repeat(80));
    
    // This is a simplified tail - in production you'd want to use fs.watchFile
    const interval = setInterval(() => {
      const recentLogs = this.logger.getRecentLogs(level, 5);
      // Only show new logs (this is simplified)
      // In a real implementation, you'd track the last read position
    }, 1000);

    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n로그 추적 중단됨');
      this.rl.prompt();
    });
  }

  showServerInfo() {
    console.log('\n🔧 서버 정보:');
    console.log(`Node.js 버전: ${process.version}`);
    console.log(`플랫폼: ${process.platform}`);
    console.log(`프로세스 ID: ${process.pid}`);
    console.log(`메모리 사용량: ${this.formatBytes(process.memoryUsage().rss)}`);
    console.log(`가동 시간: ${Math.floor(process.uptime())}초`);
    console.log(`현재 디렉토리: ${process.cwd()}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  exit() {
    console.log('👋 안녕히 가세요!');
    process.exit(0);
  }
}

// If this file is run directly
if (require.main === module) {
  const cli = new WebTerminalCLI();
  cli.start();
}

module.exports = { WebTerminalCLI };