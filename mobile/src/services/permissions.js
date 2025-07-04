import { PermissionsAndroid, Platform, Alert } from 'react-native';

export class PermissionManager {
  static async requestPermissions() {
    if (Platform.OS === 'android') {
      return await this.requestAndroidPermissions();
    }
    return true; // iOS handles permissions automatically
  }

  static async requestAndroidPermissions() {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.INTERNET,
        PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const audioPermission = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      
      if (audioPermission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          '권한 필요',
          '음성 명령 기능을 사용하려면 마이크 권한이 필요합니다.',
          [
            { text: '확인', style: 'default' }
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  static async checkAudioPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return granted;
      } catch (error) {
        console.error('Audio permission check error:', error);
        return false;
      }
    }
    return true; // iOS
  }

  static async requestAudioPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '마이크 권한',
            message: '음성 명령 기능을 사용하려면 마이크 접근 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Audio permission request error:', error);
        return false;
      }
    }
    return true; // iOS
  }
}