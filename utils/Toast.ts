import { Platform, ToastAndroid, Alert } from 'react-native';

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravity(message, ToastAndroid.SHORT, ToastAndroid.BOTTOM);
  } else {
    // For iOS, use Alert as a fallback (or you could use a third-party library)
    Alert.alert(type === 'success' ? '✅ Success' : '❌ Error', message);
  }
};
