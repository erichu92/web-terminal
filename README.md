# 웹 터미널 서버

한글 인코딩을 지원하는 WebSocket 기반 웹 터미널 서버입니다.

## 🚀 주요 기능

- 🔒 JWT 기반 인증 시스템
- 🌐 WebSocket 실시간 통신
- 📱 모바일 친화적 웹 인터페이스
- 🔤 다국어 인코딩 지원 (UTF-8, EUC-KR, Shift-JIS 등)
- ⚡ 자동 세션 관리 및 정리
- 🛡️ 보안 터미널 프로세스 격리

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

## 🛠️ 개발

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