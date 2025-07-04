import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';

const { width } = Dimensions.get('window');

const VirtualKeyboard = ({ onKeyPress, onClose }) => {
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);

  const mainKeys = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];

  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const specialKeys = [
    { key: 'Tab', value: '\t', size: 'medium' },
    { key: 'Enter', value: '\n', size: 'medium' },
    { key: 'Space', value: ' ', size: 'large' },
    { key: 'Backspace', value: '\b', size: 'medium' },
    { key: 'Escape', value: '\x1b', size: 'medium' },
  ];

  const symbolKeys = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '=', '[', ']', '\\', ';', "'", ',', '.', '/'],
    ['_', '+', '{', '}', '|', ':', '"', '<', '>', '?'],
  ];

  const handleKeyPress = (key, value) => {
    let finalValue = value || key;

    if (isShiftPressed && key.length === 1) {
      finalValue = key.toUpperCase();
    }

    if (isCtrlPressed) {
      finalValue = `\x${(finalValue.charCodeAt(0) - 96).toString(16)}`;
    }

    if (isAltPressed) {
      finalValue = `\x1b${finalValue}`;
    }

    onKeyPress(finalValue);

    if (isShiftPressed && key !== 'Shift') {
      setIsShiftPressed(false);
    }
    if (isCtrlPressed && key !== 'Ctrl') {
      setIsCtrlPressed(false);
    }
    if (isAltPressed && key !== 'Alt') {
      setIsAltPressed(false);
    }
  };

  const handleModifierPress = (modifier) => {
    switch (modifier) {
      case 'Shift':
        setIsShiftPressed(!isShiftPressed);
        break;
      case 'Ctrl':
        setIsCtrlPressed(!isCtrlPressed);
        break;
      case 'Alt':
        setIsAltPressed(!isAltPressed);
        break;
    }
  };

  const renderKey = (key, value, size = 'small', isSpecial = false) => {
    const keyStyle = [
      styles.key,
      styles[`key${size.charAt(0).toUpperCase() + size.slice(1)}`],
      isSpecial && styles.specialKey,
    ];

    const displayKey = isShiftPressed && key.length === 1 ? key.toUpperCase() : key;

    return (
      <TouchableOpacity
        key={key}
        style={keyStyle}
        onPress={() => handleKeyPress(key, value)}
        activeOpacity={0.7}
      >
        <Text style={[styles.keyText, isSpecial && styles.specialKeyText]}>
          {displayKey}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderModifierKey = (modifier) => {
    const isPressed = 
      (modifier === 'Shift' && isShiftPressed) ||
      (modifier === 'Ctrl' && isCtrlPressed) ||
      (modifier === 'Alt' && isAltPressed);

    return (
      <TouchableOpacity
        key={modifier}
        style={[
          styles.key,
          styles.keyMedium,
          styles.modifierKey,
          isPressed && styles.modifierKeyPressed,
        ]}
        onPress={() => handleModifierPress(modifier)}
        activeOpacity={0.7}
      >
        <Text style={[styles.keyText, styles.modifierKeyText]}>
          {modifier}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>가상 키보드</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.keyboardContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>숫자</Text>
          <View style={styles.row}>
            {numberKeys.map((key) => renderKey(key))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>문자</Text>
          {mainKeys.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((key) => renderKey(key))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기호</Text>
          {symbolKeys.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((key) => renderKey(key))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>특수키</Text>
          <View style={styles.row}>
            {specialKeys.map(({ key, value, size }) => 
              renderKey(key, value, size, true)
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>조합키</Text>
          <View style={styles.row}>
            {renderModifierKey('Shift')}
            {renderModifierKey('Ctrl')}
            {renderModifierKey('Alt')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>방향키</Text>
          <View style={styles.arrowContainer}>
            <TouchableOpacity
              style={[styles.key, styles.keyMedium, styles.specialKey]}
              onPress={() => handleKeyPress('Up', '\x1b[A')}
            >
              <Text style={styles.specialKeyText}>↑</Text>
            </TouchableOpacity>
            <View style={styles.arrowRow}>
              <TouchableOpacity
                style={[styles.key, styles.keyMedium, styles.specialKey]}
                onPress={() => handleKeyPress('Left', '\x1b[D')}
              >
                <Text style={styles.specialKeyText}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.key, styles.keyMedium, styles.specialKey]}
                onPress={() => handleKeyPress('Down', '\x1b[B')}
              >
                <Text style={styles.specialKeyText}>↓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.key, styles.keyMedium, styles.specialKey]}
                onPress={() => handleKeyPress('Right', '\x1b[C')}
              >
                <Text style={styles.specialKeyText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  keyboardContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  key: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 2,
  },
  keySmall: {
    width: 30,
    height: 40,
  },
  keyMedium: {
    width: 60,
    height: 40,
  },
  keyLarge: {
    width: 120,
    height: 40,
  },
  specialKey: {
    backgroundColor: '#555',
  },
  modifierKey: {
    backgroundColor: '#444',
  },
  modifierKeyPressed: {
    backgroundColor: '#00ff00',
  },
  keyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  specialKeyText: {
    color: '#fff',
    fontSize: 14,
  },
  modifierKeyText: {
    color: '#fff',
    fontSize: 12,
  },
  arrowContainer: {
    alignItems: 'center',
  },
  arrowRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VirtualKeyboard;