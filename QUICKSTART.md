# 🚀 빠른 시작 가이드

## 필요 조건

### 백엔드 서버
- Docker & Docker Compose
- Node.js 18+ (선택사항, Docker 사용 시 불필요)

### 모바일 앱
- Node.js 18+
- React Native CLI
- Android Studio (Android 개발)
- Xcode (iOS 개발, macOS만)

## 1단계: 백엔드 서버 시작

```bash
# 프로젝트 클론 후
cd web-terminal

# 서버 시작 (Docker 사용)
./start.sh
```

서버가 성공적으로 시작되면:
- 백엔드: http://localhost:3000
- WebSocket: ws://localhost:3000/terminal

## 2단계: 모바일 앱 설정

```bash
# 모바일 앱 설정
./mobile-setup.sh

# 모바일 디렉터리로 이동
cd mobile

# 개발 서버 시작
npm start
```

### Android 실행
```bash
# 새 터미널에서
npm run android
```

### iOS 실행 (macOS만)
```bash
# 새 터미널에서  
npm run ios
```

## 3단계: 앱 사용하기

1. **로그인**
   - 서버 주소: `ws://localhost:3000` (로컬) 또는 `ws://YOUR_IP:3000` (원격)
   - 사용자명: `admin`
   - 비밀번호: `admin123`

2. **터미널 사용**
   - 가상 키보드 또는 음성 명령으로 터미널 조작
   - 음성 명령 예시: "파일 목록 보여줘", "홈으로 가줘"

3. **음성 명령**
   - 🎙️ 버튼을 눌러 음성 명령 시작
   - 한국어로 말하면 터미널 명령어로 변환

## 지원 음성 명령 예시

| 음성 명령 | 터미널 명령 |
|-----------|-------------|
| 파일 목록 보여줘 | `ls -la` |
| 현재 디렉터리 어디야 | `pwd` |
| 홈으로 가줘 | `cd ~` |
| 화면 지워줘 | `clear` |
| 시스템 정보 | `uname -a` |

## 문제 해결

### 백엔드 서버 문제
```bash
# 로그 확인
docker-compose logs -f web-terminal

# 서비스 재시작
docker-compose restart web-terminal
```

### 모바일 앱 문제
```bash
# Metro 캐시 정리
npx react-native start --reset-cache

# Android 빌드 정리
cd android && ./gradlew clean && cd ..
```

### 연결 문제
1. 방화벽 설정 확인 (포트 3000)
2. 서버 IP 주소 확인
3. WebSocket 연결 가능 여부 확인

## 개발 모드

### 백엔드 개발
```bash
cd backend
npm install
npm run dev  # nodemon으로 자동 재시작
```

### 모바일 개발
```bash
cd mobile
npm start    # Metro bundler
npm run android  # Android 앱 실행
```

## 프로덕션 배포

1. **환경 변수 설정**
```bash
export JWT_SECRET="your-production-secret"
export MAX_CONNECTIONS=100
```

2. **SSL 인증서 설정** (선택사항)
```bash
mkdir -p nginx/ssl
# SSL 인증서 파일을 nginx/ssl/에 복사
```

3. **서비스 시작**
```bash
./start.sh
```

## 성능 모니터링

```bash
# 실행 중인 서비스 확인
docker-compose ps

# 리소스 사용량 확인  
docker stats

# 로그 실시간 확인
docker-compose logs -f
```

더 자세한 정보는 [docs/](./docs/) 디렉터리의 문서를 참고하세요.