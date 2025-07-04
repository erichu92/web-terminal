#!/bin/bash

# Web Terminal 시작 스크립트

set -e

echo "🚀 Web Terminal 시작 중..."

# 환경 변수 설정
export JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}
export MAX_CONNECTIONS=${MAX_CONNECTIONS:-100}
export SESSION_TIMEOUT=${SESSION_TIMEOUT:-3600}
export LOG_LEVEL=${LOG_LEVEL:-info}

# 필요한 디렉터리 생성
mkdir -p logs
mkdir -p nginx/logs
mkdir -p nginx/ssl

echo "📦 Docker 이미지 빌드 중..."
docker-compose build

echo "🔌 서비스 시작 중..."
docker-compose up -d web-terminal

echo "⏳ 서비스가 준비될 때까지 대기 중..."
sleep 10

# 헬스체크
echo "🏥 헬스체크 수행 중..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ 백엔드 서버가 정상적으로 실행 중입니다"
else
    echo "❌ 백엔드 서버 헬스체크 실패"
    echo "📋 로그 확인:"
    docker-compose logs web-terminal
    exit 1
fi

# Nginx는 포트 충돌로 건너뜀

echo ""
echo "🎉 Web Terminal이 성공적으로 시작되었습니다!"
echo ""
echo "📱 모바일 앱에서 다음 주소로 연결하세요:"
echo "   서버 주소: ws://localhost:3000 (로컬)"
echo "   서버 주소: ws://YOUR_SERVER_IP:3000 (원격)"
echo ""
echo "🔑 기본 로그인 정보:"
echo "   사용자명: admin"
echo "   비밀번호: admin123"
echo ""
echo "📊 모니터링:"
echo "   - 서비스 상태: docker-compose ps"
echo "   - 로그 확인: docker-compose logs -f"
echo "   - 서비스 중지: docker-compose down"
echo ""
echo "🌐 웹 브라우저에서 확인: http://localhost:3000/health"