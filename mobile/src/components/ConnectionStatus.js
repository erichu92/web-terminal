import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

const ConnectionStatus = ({ isConnected, isConnecting, onReconnect }) => {
  const [pulseAnimation] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (isConnecting) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isConnecting]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.setValue(0);
  };

  const getStatusColor = () => {
    if (isConnected) return '#00ff00';
    if (isConnecting) return '#ffd93d';
    return '#ff6b6b';
  };

  const getStatusText = () => {
    if (isConnected) return '연결됨';
    if (isConnecting) return '연결 중...';
    return '연결 끊김';
  };

  const getStatusIcon = () => {
    if (isConnected) return '🟢';
    if (isConnecting) return '🟡';
    return '🔴';
  };

  const animatedStyle = {
    opacity: pulseAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    }),
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.statusContainer, animatedStyle]}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {!isConnected && !isConnecting && (
          <TouchableOpacity
            style={styles.reconnectButton}
            onPress={onReconnect}
            activeOpacity={0.7}
          >
            <Text style={styles.reconnectText}>재연결</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {isConnecting && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: pulseAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reconnectButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reconnectText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressBar: {
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffd93d',
    borderRadius: 1,
  },
});

export default ConnectionStatus;