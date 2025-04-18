import { NativeModules, Platform } from 'react-native';

const { AndroidService: NativeAndroidService } = NativeModules;

const AndroidService = {
  startService: () => {
    if (Platform.OS === 'android') {
      try {
        NativeAndroidService.startService();
      } catch (error) {
        console.warn('Failed to start Android service:', error);
      }
    }
  },
  stopService: () => {
    if (Platform.OS === 'android') {
      try {
        NativeAndroidService.stopService();
      } catch (error) {
        console.warn('Failed to stop Android service:', error);
      }
    }
  },
};

export default AndroidService;
