import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert,
  BackHandler,
} from 'react-native';
import Toast from 'react-native-toast-message';
import KeepAwake from 'react-native-keep-awake';
import Orientation from 'react-native-orientation-locker';

import LoginScreen from './screens/LoginScreen';
import TerminalScreen from './screens/TerminalScreen';
import { AuthProvider, useAuth } from './services/auth';
import { TerminalProvider } from './services/terminal';
import { PermissionManager } from './services/permissions';

const AppContent = () => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await PermissionManager.requestPermissions();
      
      Orientation.lockToPortrait();
      KeepAwake.activate();
      
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress
      );
      
      setIsLoading(false);
      
      return () => {
        backHandler.remove();
        KeepAwake.deactivate();
      };
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('초기화 오류', '앱을 시작하는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    if (isAuthenticated) {
      Alert.alert(
        '앱 종료',
        '터미널 앱을 종료하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '종료', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    }
    return false;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {isAuthenticated ? (
        <TerminalProvider>
          <TerminalScreen />
        </TerminalProvider>
      ) : (
        <LoginScreen />
      )}
      <Toast />
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default App;