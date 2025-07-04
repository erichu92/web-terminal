# 웹 터미널 서버

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org/)
[![Korean](https://img.shields.io/badge/Korean-Supported-blue)](#)
[![Voice](https://img.shields.io/badge/Voice-Input-orange)](#)
[![Mobile](https://img.shields.io/badge/Mobile-Optimized-purple)](#)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

모바일 개발 환경의 혁신적 솔루션 - 한글과 음성을 지원하는 WebSocket 기반 웹 터미널 서버

## 🚀 왜 이 프로젝트인가?

### 📱 **모바일 개발의 새로운 패러다임**
LLM CLI 도구(Claude Code, GitHub Copilot CLI 등)의 보급으로 **모바일에서도 본격적인 개발이 가능한 시대**가 왔습니다. 이제 집에 있는 강력한 개발 서버에 모바일로 접속해서 AI와 함께 코딩할 수 있습니다.

### 🔥 **기존 솔루션의 한계점**
**ttyd + ngrok** 조합의 문제점들:
- ❌ **한글 입력 불가** - 한국 개발자에게 치명적
- ❌ **불편한 모바일 입력** - 가상 키보드의 한계
- ❌ **단순한 터미널만** - 현대적 기능 부재
- ❌ **세션 관리 부실** - 연결 끊김 시 작업 손실

### ✨ **우리 솔루션의 혁신**
**ngrok + 이 프로젝트** 조합으로:
- ✅ **완벽한 한글 지원** - EUC-KR, UTF-8 등 다양한 인코딩
- ✅ **음성 입력 지원** - 기본 명령어를 음성으로 편리하게 입력
- ✅ **모바일 최적화** - 터치 친화적 인터페이스
- ✅ **안정적 세션 관리** - JWT 인증 + 자동 재연결
- ✅ **실시간 로깅** - 문제 발생 시 즉시 진단 가능

### 🎯 **실제 사용 시나리오**
```
🏠 집 서버: LLM CLI + 개발 환경
     ↕ (이 프로젝트)
🌐 ngrok: 안전한 터널링  
     ↕
📱 모바일: "파일 목록 보여줘" (음성) → ls -la (실행)
```

**침대에서도, 카페에서도, 지하철에서도** - 어디서든 집의 개발 환경과 AI에 접속해서 실제 개발이 가능합니다!

### 💡 **실제 활용 예시**

**🤖 LLM CLI와 함께:**
- Claude Code, GitHub Copilot CLI 등과 연동
- AI 기반 코드 생성 및 문제 해결
- 실시간 코드 리뷰 및 최적화

**🌏 어디서든 개발:**
- 통근길 지하철에서 버그 수정
- 카페에서 새 기능 개발
- 여행 중에도 긴급 배포 가능

**🎤 음성 입력 지원:**
- 기본 명령어를 음성으로 편리하게 입력
- 한글 음성을 영어 명령어로 자동 변환
- 모바일에서 키보드 타이핑 부담 감소

## 🚀 주요 기능

- 🔒 JWT 기반 인증 시스템
- 🌐 WebSocket 실시간 통신
- 📱 모바일 친화적 웹 인터페이스
- 🔤 다국어 인코딩 지원 (UTF-8, EUC-KR, Shift-JIS 등)
- ⚡ 자동 세션 관리 및 정리
- 🛡️ 보안 터미널 프로세스 격리

## ⚡ 빠른 시작

```bash
# 1. 프로젝트 클론 및 설치
git clone https://github.com/erichu92/web-terminal-server.git
cd web-terminal-server
npm install

# 2. 서버 시작
npm start

# 3. ngrok으로 외부 접속 가능하게 설정
ngrok http 3000

# 4. 모바일에서 ngrok URL 접속 (바로 모바일 터미널 화면)
# https://abc123.ngrok.io

# 5. 기본 로그인 정보로 접속
# ID: admin, PW: admin123
```

## 📦 설치 및 실행

### 요구사항
- Node.js 16.0.0 이상
- npm 8.0.0 이상

### 설치
```bash
npm install
```

### 환경 변수 설정

`.env` 파일 생성:
```env
PORT=3000
JWT_SECRET=your-secret-key
MAX_CONNECTIONS=100
NODE_ENV=production
```

### 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## 📋 API 엔드포인트

### 인증
- `POST /api/auth/login` - 사용자 로그인
- `POST /api/auth/refresh` - JWT 토큰 갱신

### 세션 관리
- `GET /api/sessions` - 사용자 세션 목록 조회
- `DELETE /api/sessions/:id` - 세션 종료

### 상태 확인
- `GET /health` - 서버 상태 확인

## 🔌 WebSocket 프로토콜

`/terminal` 엔드포인트로 JWT 인증과 함께 연결:

```javascript
const ws = new WebSocket('ws://localhost:3000/terminal');

// 인증
ws.send(JSON.stringify({
  type: 'auth',
  data: { token: 'your-jwt-token' }
}));

// 터미널 세션 생성
ws.send(JSON.stringify({
  type: 'session',
  data: { action: 'create', shell: '/bin/bash' }
}));

// 명령어 전송
ws.send(JSON.stringify({
  type: 'command',
  data: { command: 'ls -la\r' }
}));
```

## 📁 프로젝트 구조

```
web-terminal-server/
├── src/
│   ├── server.js      # 메인 서버 클래스
│   ├── websocket.js   # WebSocket 핸들러
│   ├── terminal.js    # 터미널 프로세스 관리
│   ├── auth.js        # 인증 미들웨어
│   └── encoding.js    # 인코딩 처리기
├── public/            # 정적 파일
│   └── mobile.html    # 모바일 터미널 인터페이스
├── package.json
└── README.md
```

## 🛠️ 관리 도구

### CLI 관리 도구 실행
```bash
npm run cli
# 또는
npm run admin
```

**사용 가능한 명령어:**
- `user:list` - 사용자 목록 조회
- `user:create <username> <password> [role]` - 새 사용자 생성
- `user:delete <username>` - 사용자 삭제
- `user:password <username> <new_password>` - 비밀번호 변경
- `logs:recent [level] [lines]` - 최근 로그 조회
- `logs:stats` - 로그 파일 통계
- `server:info` - 서버 정보 조회

### 로그 관리

로그는 `logs/` 디렉토리에 저장됩니다:
- `error.log` - 에러 로그
- `warn.log` - 경고 로그  
- `info.log` - 정보 로그
- `debug.log` - 디버그 로그
- `combined.log` - 통합 로그

### 테스트 실행
```bash
npm test
```

### 코드 스타일 검사
```bash
npm run lint
```

## 📄 라이선스

MIT License
