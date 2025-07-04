export class SpeechService {
  constructor() {
    this.commandMappings = new Map([
      // 파일 및 디렉터리 관련
      ['파일 목록', 'ls'],
      ['파일 목록 보여줘', 'ls -la'],
      ['파일 리스트', 'ls -la'],
      ['현재 폴더', 'ls'],
      ['현재 디렉토리', 'pwd'],
      ['현재 디렉터리 어디야', 'pwd'],
      ['어디에 있어', 'pwd'],
      
      // 네비게이션
      ['홈으로 가줘', 'cd ~'],
      ['홈으로', 'cd ~'],
      ['루트로', 'cd /'],
      ['루트로 가줘', 'cd /'],
      ['상위 폴더', 'cd ..'],
      ['상위 디렉터리', 'cd ..'],
      ['뒤로 가줘', 'cd ..'],
      
      // 시스템 정보
      ['시스템 정보', 'uname -a'],
      ['날짜', 'date'],
      ['시간', 'date'],
      ['날짜 시간', 'date'],
      ['디스크 용량', 'df -h'],
      ['메모리 정보', 'free -h'],
      ['프로세스 목록', 'ps aux'],
      
      // 네트워크
      ['아이피 주소', 'ip addr show'],
      ['네트워크 정보', 'ifconfig'],
      ['핑 테스트', 'ping -c 4 google.com'],
      
      // 텍스트 처리
      ['화면 지워줘', 'clear'],
      ['클리어', 'clear'],
      ['터미널 정리', 'clear'],
      ['히스토리', 'history'],
      ['명령어 히스토리', 'history'],
      
      // Git 관련
      ['깃 상태', 'git status'],
      ['깃 로그', 'git log --oneline'],
      ['깃 브랜치', 'git branch'],
      
      // 종료
      ['나가기', 'exit'],
      ['종료', 'exit'],
      ['터미널 종료', 'exit'],
    ]);

    this.directoryMappings = new Map([
      ['홈', '~'],
      ['루트', '/'],
      ['다운로드', '~/Downloads'],
      ['다운로드 폴더', '~/Downloads'],
      ['문서', '~/Documents'],
      ['문서 폴더', '~/Documents'],
      ['데스크탑', '~/Desktop'],
      ['바탕화면', '~/Desktop'],
    ]);

    this.parameterPatterns = [
      {
        pattern: /(.+) 폴더로 가줘/,
        command: 'cd',
        extractParam: (match) => this.directoryMappings.get(match[1]) || match[1]
      },
      {
        pattern: /(.+) 디렉터리로/,
        command: 'cd',
        extractParam: (match) => this.directoryMappings.get(match[1]) || match[1]
      },
      {
        pattern: /(.+) 검색/,
        command: 'find . -name',
        extractParam: (match) => `"*${match[1]}*"`
      },
      {
        pattern: /(.+) 파일 찾기/,
        command: 'find . -name',
        extractParam: (match) => `"*${match[1]}*"`
      },
      {
        pattern: /(.+) 만들어줘/,
        command: 'mkdir',
        extractParam: (match) => match[1]
      },
      {
        pattern: /(.+) 폴더 만들기/,
        command: 'mkdir',
        extractParam: (match) => match[1]
      },
      {
        pattern: /(.+) 삭제/,
        command: 'rm -rf',
        extractParam: (match) => match[1]
      },
      {
        pattern: /(.+) 파일 삭제/,
        command: 'rm',
        extractParam: (match) => match[1]
      },
      {
        pattern: /(.+) 내용 보기/,
        command: 'cat',
        extractParam: (match) => match[1]
      },
      {
        pattern: /(.+) 편집/,
        command: 'nano',
        extractParam: (match) => match[1]
      },
    ];
  }

  async processVoiceCommand(spokenText) {
    if (!spokenText) {
      return null;
    }

    const normalizedText = this.normalizeText(spokenText);
    
    // 직접 매핑 확인
    const directCommand = this.commandMappings.get(normalizedText);
    if (directCommand) {
      return directCommand;
    }

    // 패턴 매칭 확인
    for (const pattern of this.parameterPatterns) {
      const match = normalizedText.match(pattern.pattern);
      if (match) {
        const param = pattern.extractParam(match);
        return `${pattern.command} ${param}`;
      }
    }

    // 유사한 명령어 찾기
    const similarCommand = this.findSimilarCommand(normalizedText);
    if (similarCommand) {
      return similarCommand;
    }

    // 직접 명령어로 처리 (영어 명령어인 경우)
    if (this.isLikelyCommand(normalizedText)) {
      return normalizedText;
    }

    return null;
  }

  normalizeText(text) {
    return text
      .trim()
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .replace(/\s+/g, ' ');
  }

  findSimilarCommand(text) {
    const commands = Array.from(this.commandMappings.keys());
    
    for (const command of commands) {
      if (this.calculateSimilarity(text, command) > 0.7) {
        return this.commandMappings.get(command);
      }
    }

    return null;
  }

  calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = matrix[len2][len1];
    return 1 - distance / Math.max(len1, len2);
  }

  isLikelyCommand(text) {
    const commonCommands = [
      'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find',
      'ps', 'top', 'df', 'du', 'free', 'uname', 'date', 'whoami', 'which',
      'git', 'npm', 'node', 'python', 'pip', 'docker', 'curl', 'wget'
    ];

    const words = text.split(' ');
    return commonCommands.includes(words[0]);
  }

  getSupportedCommands() {
    return Array.from(this.commandMappings.entries()).map(([voice, command]) => ({
      voice,
      command,
      category: this.categorizeCommand(command)
    }));
  }

  categorizeCommand(command) {
    if (command.startsWith('ls') || command.startsWith('pwd')) return '파일/디렉터리';
    if (command.startsWith('cd')) return '네비게이션';
    if (command.startsWith('git')) return 'Git';
    if (['clear', 'history'].includes(command)) return '터미널';
    if (['uname', 'date', 'free', 'df', 'ps'].some(cmd => command.startsWith(cmd))) return '시스템';
    if (['ping', 'ifconfig', 'ip'].some(cmd => command.startsWith(cmd))) return '네트워크';
    return '기타';
  }

  addCustomCommand(voiceCommand, terminalCommand) {
    this.commandMappings.set(this.normalizeText(voiceCommand), terminalCommand);
  }

  removeCustomCommand(voiceCommand) {
    this.commandMappings.delete(this.normalizeText(voiceCommand));
  }

  getCommandSuggestions(partialText) {
    const normalized = this.normalizeText(partialText);
    const suggestions = [];

    for (const [voice, command] of this.commandMappings) {
      if (voice.includes(normalized)) {
        suggestions.push({ voice, command });
      }
    }

    return suggestions.slice(0, 5);
  }
}