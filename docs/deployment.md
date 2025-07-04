# 배포 가이드

## 배포 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client      │    │     Nginx       │    │  Node.js Server │
│   (Mobile App)  │ ◄─►│   (Reverse      │◄──►│   (Terminal     │
│                 │    │    Proxy)       │    │    Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │      SSL        │    │    Process      │
                       │   Certificate   │    │   Manager       │
                       │  (Let's Encrypt)│    │     (PM2)       │
                       └─────────────────┘    └─────────────────┘
```

## Docker 컨테이너 구성

### 1. Backend Dockerfile

```dockerfile
FROM node:18-alpine

# 작업 디렉터리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    util-linux

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY src/ ./src/

# 사용자 생성 (보안)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S terminal -u 1001

# 권한 설정
RUN chown -R terminal:nodejs /app
USER terminal

# 포트 노출
EXPOSE 3000

# 시작 명령
CMD ["node", "src/server.js"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  web-terminal:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - web-terminal
    restart: unless-stopped

volumes:
  redis_data:
```

## Nginx 설정

### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server web-terminal:3000;
    }

    # WebSocket 업그레이드를 위한 맵 설정
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        server_name your-domain.com;
        
        # HTTP를 HTTPS로 리다이렉트
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL 설정
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

        # 일반 HTTP 요청
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket 연결
        location /terminal {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket 타임아웃 설정
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }
    }
}
```

## 환경별 배포

### 1. 개발 환경

```bash
# 개발 서버 실행
npm run dev

# 또는 Docker 사용
docker-compose -f docker-compose.dev.yml up
```

### 2. 스테이징 환경

```bash
# 스테이징 배포
docker-compose -f docker-compose.staging.yml up -d

# 로그 확인
docker-compose logs -f web-terminal
```

### 3. 프로덕션 환경

```bash
# 프로덕션 배포
docker-compose -f docker-compose.prod.yml up -d

# 헬스체크
curl -f http://localhost:3000/health || exit 1
```

## 모니터링 및 로깅

### 1. PM2 설정 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'web-terminal',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 2. 로그 관리

```bash
# PM2 로그 확인
pm2 logs web-terminal

# 로그 로테이션
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. 헬스체크 엔드포인트

```javascript
// src/health.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

## 보안 설정

### 1. 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt-get install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. 환경 변수 설정

```bash
# .env 파일
NODE_ENV=production
PORT=3000
JWT_SECRET=your-very-secure-secret-key
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
MAX_CONNECTIONS=100
SESSION_TIMEOUT=3600
```

## 백업 및 복구

### 1. 데이터 백업

```bash
# Redis 백업
docker exec redis redis-cli BGSAVE

# 설정 파일 백업
tar -czf backup-$(date +%Y%m%d).tar.gz \
    docker-compose.yml \
    nginx.conf \
    .env \
    logs/
```

### 2. 복구 절차

```bash
# 백업에서 복구
tar -xzf backup-20240101.tar.gz

# 서비스 재시작
docker-compose down
docker-compose up -d
```

## 성능 최적화

### 1. 서버 최적화

```bash
# 시스템 한계 설정
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 커널 파라미터 조정
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

### 2. Node.js 최적화

```javascript
// src/server.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // 서버 실행
  require('./app');
}
```

## 업데이트 절차

### 1. 무중단 배포

```bash
# 새 버전 빌드
docker build -t web-terminal:new .

# 순차 업데이트
docker-compose up -d --no-deps --build web-terminal

# 헬스체크
curl -f http://localhost:3000/health
```

### 2. 롤백 절차

```bash
# 이전 버전으로 롤백
docker tag web-terminal:old web-terminal:latest
docker-compose up -d --no-deps web-terminal
```