import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import { SpeechService } from '../services/speech';

const VoiceInput = ({ isConnected, onVoiceCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [animationValue] = useState(new Animated.Value(0));
  const speechService = new SpeechService();

  useEffect(() => {
    setupVoiceRecognition();
    return () => {
      cleanupVoiceRecognition();
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const setupVoiceRecognition = async () => {
    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechPartialResults = onSpeechPartialResults;
    } catch (error) {
      console.error('Voice recognition setup error:', error);
    }
  };

  const cleanupVoiceRecognition = async () => {
    try {
      Voice.destroy();
    } catch (error) {
      console.error('Voice recognition cleanup error:', error);
    }
  };

  const onSpeechStart = () => {
    setIsListening(true);
    setRecognizedText('');
  };

  const onSpeechEnd = () => {
    setIsListening(false);
    setIsProcessing(true);
  };

  const onSpeechResults = async (event) => {
    if (event.value && event.value.length > 0) {
      const spokenText = event.value[0];
      setRecognizedText(spokenText);
      
      try {
        const command = await speechService.processVoiceCommand(spokenText);
        if (command) {
          onVoiceCommand(command);
          setRecognizedText(`명령: ${command}`);
        } else {
          setRecognizedText('명령을 인식할 수 없습니다');
        }
      } catch (error) {
        console.error('Voice command processing error:', error);
        setRecognizedText('음성 처리 중 오류 발생');
      }
      
      setTimeout(() => {
        setRecognizedText('');
        setIsProcessing(false);
      }, 2000);
    }
  };

  const onSpeechPartialResults = (event) => {
    if (event.value && event.value.length > 0) {
      setRecognizedText(event.value[0]);
    }
  };

  const onSpeechError = (error) => {
    console.error('Voice recognition error:', error);
    setIsListening(false);
    setIsProcessing(false);
    
    let errorMessage = '음성 인식 오류';
    if (error.error) {
      switch (error.error.code) {
        case '7':
          errorMessage = '네트워크 연결을 확인해주세요';
          break;
        case '9':
          errorMessage = '음성 인식 서비스를 사용할 수 없습니다';
          break;
        default:
          errorMessage = '음성 인식 중 오류가 발생했습니다';
      }
    }
    
    Alert.alert('음성 인식 오류', errorMessage);
  };

  const startListening = async () => {
    if (!isConnected) {
      Alert.alert('연결 오류', '터미널이 연결되지 않았습니다');
      return;
    }

    try {
      await Voice.start('ko-KR');
    } catch (error) {
      console.error('Start listening error:', error);
      Alert.alert('음성 인식 시작 실패', '음성 인식을 시작할 수 없습니다');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Stop listening error:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    animationValue.setValue(0);
  };

  const animatedStyle = {
    opacity: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  const getButtonColor = () => {
    if (isListening) return '#ff6b6b';
    if (isProcessing) return '#ffd93d';
    return '#4ecdc4';
  };

  const getButtonText = () => {
    if (isListening) return '🎤 듣는 중...';
    if (isProcessing) return '⏳ 처리 중...';
    return '🎙️ 음성 명령';
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.buttonContainer, animatedStyle]}>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            { backgroundColor: getButtonColor() },
            !isConnected && styles.disabledButton,
          ]}
          onPress={isListening ? stopListening : startListening}
          disabled={!isConnected || isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </Animated.View>

      {recognizedText ? (
        <View style={styles.textContainer}>
          <Text style={styles.recognizedText}>{recognizedText}</Text>
        </View>
      ) : null}

      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          "파일 목록 보여줘", "현재 디렉토리 어디야", "홈으로 가줘" 등으로 말해보세요
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonContainer: {
    marginBottom: 10,
  },
  voiceButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textContainer: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: 280,
  },
  recognizedText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  helpContainer: {
    paddingHorizontal: 20,
  },
  helpText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VoiceInput;