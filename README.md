# Mobile Web Terminal App

Speech-to-Text 기능을 지원하는 모바일 웹 터미널 앱

## 프로젝트 개요

ttyd + ngrok 조합의 단점을 보완하여 더 나은 사용성을 제공하는 모바일 터미널 앱입니다.

### 주요 기능
- 🌐 다국어 인코딩/디코딩 지원
- 📱 모바일 최적화된 UI/UX
- 🔊 Speech-to-Text 음성 명령 지원
- 🔄 연결 안정성 및 세션 지속성
- 🔐 보안 인증 시스템

### 기술 스택

**백엔드**
- Node.js + Express
- WebSocket (ws)
- node-pty (터미널 프로세스 관리)
- iconv-lite (다국어 인코딩)

**모바일 앱**
- React Native
- @react-native-voice/voice (Speech-to-Text)
- WebSocket Client

**배포**
- Docker
- PM2 (프로세스 관리)
- Nginx (프록시)

## 아키텍처

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│                 │ ◄──────────────► │                 │
│   Mobile App    │                  │  Backend Server │
│                 │                  │                 │
│  ┌───────────┐  │                  │  ┌───────────┐  │
│  │    UI     │  │                  │  │ WebSocket │  │
│  │  Terminal │  │                  │  │  Handler  │  │
│  │  Display  │  │                  │  └───────────┘  │
│  └───────────┘  │                  │                 │
│                 │                  │  ┌───────────┐  │
│  ┌───────────┐  │                  │  │ Terminal  │  │
│  │ Speech-to │  │                  │  │  Process  │  │
│  │   Text    │  │                  │  │ (node-pty)│  │
│  └───────────┘  │                  │  └───────────┘  │
│                 │                  │                 │
│  ┌───────────┐  │                  │  ┌───────────┐  │
│  │  Virtual  │  │                  │  │ Encoding  │  │
│  │ Keyboard  │  │                  │  │  Handler  │  │
│  └───────────┘  │                  │  └───────────┘  │
└─────────────────┘                  └─────────────────┘
```

## 프로젝트 구조

```
web-terminal/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express 서버
│   │   ├── websocket.js       # WebSocket 핸들러
│   │   ├── terminal.js        # 터미널 프로세스 관리
│   │   ├── encoding.js        # 다국어 인코딩 처리
│   │   └── auth.js            # 인증 시스템
│   ├── package.json
│   └── Dockerfile
├── mobile/
│   ├── src/
│   │   ├── App.js             # 메인 앱
│   │   ├── components/
│   │   │   ├── Terminal.js    # 터미널 화면
│   │   │   ├── VirtualKeyboard.js  # 가상 키보드
│   │   │   └── VoiceInput.js  # 음성 입력
│   │   ├── services/
│   │   │   ├── websocket.js   # WebSocket 클라이언트
│   │   │   └── speech.js      # Speech-to-Text 서비스
│   │   └── utils/
│   │       └── encoding.js    # 인코딩 유틸리티
│   ├── package.json
│   └── android/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
└── README.md
```

## 개발 로드맵

### Phase 1: 기본 터미널 기능 (2-3주)
- [x] 프로젝트 설계 및 구조 설정
- [ ] WebSocket 터미널 서버 구현
- [ ] 다국어 인코딩 지원
- [ ] 기본 모바일 앱 UI

### Phase 2: 향상된 기능 (2-3주)
- [ ] 연결 안정성 구현
- [ ] Speech-to-Text 통합
- [ ] 음성 명령 처리
- [ ] 보안 인증 시스템

### Phase 3: 최적화 및 배포 (1-2주)
- [ ] 테스트 및 최적화
- [ ] 배포 환경 구성
- [ ] 문서화

## 시작하기

### 백엔드 실행
```bash
cd backend
npm install
npm start
```

### 모바일 앱 실행
```bash
cd mobile
npm install
npx react-native run-android
```

## 라이선스
MIT# web-terminal
