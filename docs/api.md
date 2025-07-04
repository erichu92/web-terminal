# API 설계

## WebSocket API

### 연결 엔드포인트
```
ws://localhost:3000/terminal
```

### 인증
```javascript
// 연결 시 인증 토큰 전송
{
  "type": "auth",
  "data": {
    "token": "jwt-token-here"
  }
}
```

## 메시지 형식

### 1. 명령 실행
```javascript
// 클라이언트 → 서버
{
  "type": "command",
  "sessionId": "session-uuid",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "command": "ls -la",
    "encoding": "utf-8"
  }
}
```

### 2. 출력 전송
```javascript
// 서버 → 클라이언트
{
  "type": "output",
  "sessionId": "session-uuid",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "output": "total 12\ndrwxr-xr-x 3 user user 4096 Jan 1 00:00 .\n",
    "encoding": "utf-8",
    "isError": false
  }
}
```

### 3. 제어 명령
```javascript
// 터미널 크기 변경
{
  "type": "control",
  "sessionId": "session-uuid",
  "data": {
    "action": "resize",
    "cols": 80,
    "rows": 24
  }
}

// 시그널 전송
{
  "type": "control",
  "sessionId": "session-uuid",
  "data": {
    "action": "signal",
    "signal": "SIGINT"
  }
}
```

### 4. 세션 관리
```javascript
// 새 세션 생성
{
  "type": "session",
  "data": {
    "action": "create",
    "shell": "/bin/bash",
    "cwd": "/home/user"
  }
}

// 세션 종료
{
  "type": "session",
  "data": {
    "action": "close"
  }
}
```

## HTTP REST API

### 인증 엔드포인트

#### POST /api/auth/login
```javascript
// 요청
{
  "username": "user",
  "password": "password"
}

// 응답
{
  "token": "jwt-token",
  "expires": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": "user-id",
    "username": "user"
  }
}
```

#### POST /api/auth/refresh
```javascript
// 요청
{
  "refreshToken": "refresh-token"
}

// 응답
{
  "token": "new-jwt-token",
  "expires": "2024-01-01T00:00:00.000Z"
}
```

### 세션 관리

#### GET /api/sessions
```javascript
// 응답
{
  "sessions": [
    {
      "id": "session-uuid",
      "created": "2024-01-01T00:00:00.000Z",
      "lastActivity": "2024-01-01T00:00:00.000Z",
      "shell": "/bin/bash",
      "cwd": "/home/user",
      "isActive": true
    }
  ]
}
```

#### DELETE /api/sessions/:id
```javascript
// 응답
{
  "message": "Session terminated successfully"
}
```

## Speech-to-Text API

### 음성 명령 처리

#### POST /api/speech/parse
```javascript
// 요청
{
  "text": "list all files in current directory",
  "language": "en-US"
}

// 응답
{
  "command": "ls -la",
  "confidence": 0.95,
  "alternatives": [
    {
      "command": "ls -l",
      "confidence": 0.85
    }
  ]
}
```

### 지원 명령어 매핑

#### GET /api/speech/commands
```javascript
// 응답
{
  "commands": {
    "list files": "ls",
    "list all files": "ls -la",
    "change directory": "cd",
    "go to home": "cd ~",
    "show current directory": "pwd",
    "clear screen": "clear",
    "exit": "exit"
  },
  "languages": ["en-US", "ko-KR", "ja-JP"]
}
```

## 에러 처리

### 에러 메시지 형식
```javascript
{
  "type": "error",
  "sessionId": "session-uuid",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "code": "TERMINAL_ERROR",
    "message": "Command execution failed",
    "details": {
      "command": "invalid-command",
      "exitCode": 127
    }
  }
}
```

### 에러 코드

| 코드 | 설명 |
|------|------|
| `AUTH_FAILED` | 인증 실패 |
| `SESSION_NOT_FOUND` | 세션을 찾을 수 없음 |
| `TERMINAL_ERROR` | 터미널 실행 오류 |
| `ENCODING_ERROR` | 인코딩 변환 오류 |
| `CONNECTION_ERROR` | 연결 오류 |
| `SPEECH_ERROR` | 음성 인식 오류 |

## 상태 코드

### WebSocket 연결 상태
- `1000`: 정상 종료
- `1001`: 서버 종료
- `1002`: 프로토콜 오류
- `1003`: 지원하지 않는 데이터 타입
- `1011`: 서버 오류
- `4000`: 인증 실패
- `4001`: 세션 만료
- `4002`: 권한 부족

### HTTP 상태 코드
- `200`: 성공
- `201`: 생성 완료
- `400`: 잘못된 요청
- `401`: 인증 필요
- `403`: 권한 없음
- `404`: 리소스 없음
- `500`: 서버 오류