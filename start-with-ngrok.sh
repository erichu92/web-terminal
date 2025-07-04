#!/bin/bash

# Web Terminal을 외부 접근 가능하도록 실행하는 스크립트

cd /Users/hmh/IdeaProjects/web-terminal/backend

echo "🚀 Starting Web Terminal Server..."

# 백그라운드에서 서버 실행
nohup node src/server.js > server.log 2>&1 &
SERVER_PID=$!

echo "📡 Server started with PID: $SERVER_PID"
echo "⏳ Waiting 3 seconds for server to initialize..."
sleep 3

echo "🌐 Starting ngrok tunnel..."
ngrok http 3000 --log=stdout &
NGROK_PID=$!

echo "🔗 ngrok started with PID: $NGROK_PID"
echo ""
echo "📱 Access options:"
echo "  Local: http://localhost:3000/mobile.html"
echo "  Network: http://192.168.45.8:3000/mobile.html"
echo "  External: Check ngrok output above for public URL"
echo ""
echo "To stop everything:"
echo "  kill $SERVER_PID $NGROK_PID"
echo ""
echo "Press Ctrl+C to stop ngrok and view tunnel URL"

# ngrok이 종료될 때까지 대기
wait $NGROK_PID