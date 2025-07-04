#!/bin/bash

# Mobile App 설정 스크립트

set -e

echo "📱 React Native 모바일 앱 설정 중..."

cd mobile

# Node.js 의존성 설치
echo "📦 Node.js 패키지 설치 중..."
npm install

# React Native 환경 확인
echo "🔍 React Native 환경 확인 중..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx가 설치되지 않았습니다. Node.js를 다시 설치해주세요."
    exit 1
fi

# Android 설정 확인
if [ -d "android" ]; then
    echo "🤖 Android 프로젝트 설정 확인 중..."
    
    # Android 권한 설정
    if [ ! -f "android/app/src/main/AndroidManifest.xml" ]; then
        echo "📄 AndroidManifest.xml 생성 중..."
        mkdir -p android/app/src/main
        cat > android/app/src/main/AndroidManifest.xml << 'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.webterminal">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="false"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF
    fi
fi

# iOS 설정 (MacOS에서만)
if [[ "$OSTYPE" == "darwin"* ]] && [ -d "ios" ]; then
    echo "🍎 iOS 프로젝트 설정 확인 중..."
    
    # CocoaPods 설치 확인
    if command -v pod &> /dev/null; then
        echo "📦 CocoaPods 의존성 설치 중..."
        cd ios
        pod install
        cd ..
    else
        echo "⚠️ CocoaPods가 설치되지 않았습니다. iOS 빌드를 위해 설치해주세요:"
        echo "   sudo gem install cocoapods"
    fi
fi

echo ""
echo "✅ 모바일 앱 설정이 완료되었습니다!"
echo ""
echo "🏃 앱 실행 방법:"
echo ""
echo "Android:"
echo "   1. Android 에뮬레이터 또는 디바이스 연결"
echo "   2. npm run android"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
echo "iOS (macOS만):"
echo "   1. iOS 시뮬레이터 실행"
echo "   2. npm run ios"
echo ""
fi
echo "개발 서버:"
echo "   npm start"
echo ""
echo "📝 개발 팁:"
echo "   - Metro bundler가 자동으로 시작됩니다"
echo "   - 코드 변경 시 자동 새로고침됩니다"
echo "   - Android: Ctrl+M (에뮬레이터) 또는 기기 흔들기로 개발 메뉴 열기"
echo "   - iOS: Cmd+D (시뮬레이터)로 개발 메뉴 열기"