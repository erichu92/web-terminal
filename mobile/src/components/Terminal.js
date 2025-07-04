import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const Terminal = forwardRef(({ output, isConnected, cols, rows, onCommand }, ref) => {
  const [currentInput, setCurrentInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollViewRef = useRef(null);
  const outputRef = useRef([]);
  const inputRef = useRef('');

  useImperativeHandle(ref, () => ({
    clear: () => {
      outputRef.current = [];
      setCurrentInput('');
      setCursorPosition(0);
    },
    focus: () => {
      // Focus functionality can be implemented here
    },
    insertText: (text) => {
      const newInput = inputRef.current + text;
      setCurrentInput(newInput);
      inputRef.current = newInput;
      setCursorPosition(newInput.length);
    }
  }));

  useEffect(() => {
    if (output && output.length > 0) {
      outputRef.current.push(...output);
      if (!isScrolling) {
        scrollToBottom();
      }
    }
  }, [output]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y >= contentSize.height - layoutMeasurement.height - 50;
    setIsScrolling(!isAtBottom);
  };

  const handleTouchStart = () => {
    setIsScrolling(true);
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      setIsScrolling(false);
    }, 2000);
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: handleTouchStart,
    onPanResponderRelease: handleTouchEnd,
  });

  const processOutput = (text) => {
    if (!text) return '';
    
    return text
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
      .replace(/\x1b\[2J/g, '') // Clear screen
      .replace(/\x1b\[H/g, '') // Home cursor
      .replace(/\x1b\[K/g, ''); // Clear line
  };

  const renderOutput = () => {
    return outputRef.current.map((line, index) => {
      const processedLine = processOutput(line);
      return (
        <Text key={index} style={styles.outputLine}>
          {processedLine}
        </Text>
      );
    });
  };

  const renderCursor = () => {
    if (!isConnected) return null;
    
    return (
      <View style={styles.cursorContainer}>
        <Text style={styles.prompt}>$ </Text>
        <Text style={styles.inputText}>
          {currentInput.substring(0, cursorPosition)}
        </Text>
        <View style={styles.cursor} />
        <Text style={styles.inputText}>
          {currentInput.substring(cursorPosition)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        {...panResponder.panHandlers}
      >
        <View style={styles.content}>
          {renderOutput()}
          {renderCursor()}
        </View>
      </ScrollView>
      
      {!isConnected && (
        <View style={styles.disconnectedOverlay}>
          <Text style={styles.disconnectedText}>연결이 끊어짐</Text>
          <Text style={styles.disconnectedSubtext}>재연결을 시도하세요</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  content: {
    minHeight: '100%',
  },
  outputLine: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
    marginBottom: 2,
  },
  cursorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  prompt: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  inputText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  cursor: {
    width: 2,
    height: 18,
    backgroundColor: '#00ff00',
    marginHorizontal: 1,
  },
  disconnectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  disconnectedText: {
    color: '#ff0000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  disconnectedSubtext: {
    color: '#666',
    fontSize: 14,
  },
});

export default Terminal;