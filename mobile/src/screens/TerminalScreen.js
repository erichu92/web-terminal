import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  BackHandler,
  TouchableOpacity,
  Text,
} from 'react-native';
import Orientation from 'react-native-orientation-locker';

import Terminal from '../components/Terminal';
import VirtualKeyboard from '../components/VirtualKeyboard';
import VoiceInput from '../components/VoiceInput';
import ConnectionStatus from '../components/ConnectionStatus';
import { useTerminal } from '../services/terminal';
import { useAuth } from '../services/auth';

const { width, height } = Dimensions.get('window');

const TerminalScreen = () => {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  const [terminalSize, setTerminalSize] = useState({ cols: 80, rows: 24 });
  const terminalRef = useRef(null);
  
  const { 
    isConnected, 
    isConnecting, 
    output, 
    sendCommand, 
    sendControl,
    reconnect 
  } = useTerminal();
  
  const { logout } = useAuth();

  useEffect(() => {
    const updateOrientation = (orientation) => {
      setIsPortrait(orientation === 'PORTRAIT');
      calculateTerminalSize(orientation === 'PORTRAIT');
    };

    const subscription = Orientation.addOrientationListener(updateOrientation);
    
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    calculateTerminalSize(true);

    return () => {
      subscription?.remove();
      backHandler.remove();
    };
  }, []);

  const calculateTerminalSize = (portrait) => {
    const screenWidth = portrait ? width : height;
    const screenHeight = portrait ? height : width;
    
    const charWidth = 8;
    const charHeight = 16;
    const padding = 20;
    const keyboardHeight = showKeyboard ? 200 : 0;
    
    const availableWidth = screenWidth - padding;
    const availableHeight = screenHeight - padding - keyboardHeight - 100;
    
    const cols = Math.floor(availableWidth / charWidth);
    const rows = Math.floor(availableHeight / charHeight);
    
    setTerminalSize({ cols, rows });
    
    if (isConnected) {
      sendControl('resize', { cols, rows });
    }
  };

  const handleBackPress = () => {
    if (showKeyboard) {
      setShowKeyboard(false);
      return true;
    }
    
    Alert.alert(
      '연결 종료',
      '터미널 연결을 종료하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '종료', onPress: logout }
      ]
    );
    return true;
  };

  const handleCommand = (command) => {
    if (isConnected) {
      sendCommand(command);
    }
  };

  const handleVoiceCommand = (command) => {
    if (isConnected && command) {
      sendCommand(command);
    }
  };

  const handleKeyPress = (key) => {
    if (isConnected) {
      sendCommand(key);
    }
  };

  const handleReconnect = () => {
    reconnect();
  };

  const toggleKeyboard = () => {
    setShowKeyboard(!showKeyboard);
    
    setTimeout(() => {
      calculateTerminalSize(isPortrait);
    }, 100);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <ConnectionStatus 
        isConnected={isConnected}
        isConnecting={isConnecting}
        onReconnect={handleReconnect}
      />

      <View style={styles.terminalContainer}>
        <Terminal
          ref={terminalRef}
          output={output}
          isConnected={isConnected}
          cols={terminalSize.cols}
          rows={terminalSize.rows}
          onCommand={handleCommand}
        />
      </View>

      <View style={styles.controlsContainer}>
        <VoiceInput
          isConnected={isConnected}
          onVoiceCommand={handleVoiceCommand}
        />
      </View>

      {showKeyboard && (
        <View style={styles.keyboardContainer}>
          <VirtualKeyboard
            onKeyPress={handleKeyPress}
            onClose={() => setShowKeyboard(false)}
          />
        </View>
      )}

      {!showKeyboard && (
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={styles.keyboardButton}
            onPress={toggleKeyboard}
          >
            <Text style={styles.keyboardButtonText}>⌨️</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  terminalContainer: {
    flex: 1,
    padding: 10,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  keyboardContainer: {
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  floatingControls: {
    position: 'absolute',
    bottom: 80,
    right: 20,
  },
  keyboardButton: {
    backgroundColor: '#333',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  keyboardButtonText: {
    fontSize: 24,
  },
});

export default TerminalScreen;