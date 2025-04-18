import * as Notifications from 'expo-notifications';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';
import { Audio } from 'expo-av';
import { defaultSounds } from '../constants/sounds';
//import AndroidService from './AndroidService';
import mitt from 'mitt';
import { playReminderSound } from '../screens/RecordScreen';
const { AndroidService } = NativeModules;

const notificationEmitter = mitt();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  },

  notificationEmitter,

  async scheduleNotification(reminder) {
    try {
      if (reminder.notificationId) {
        await this.cancelNotification(reminder.notificationId);
      }

      const trigger = new Date(reminder.date);
      if (trigger <= new Date()) {
        throw new Error('Cannot schedule notification for past date');
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Audio permissions not granted');
        return;
      }

      let notificationContent = {
        title: reminder.title,
        body: 'Time for your reminder!',
        data: {
          reminderId: reminder.id,
          audioUri: reminder.audioUri,
          selectedSound: reminder.selectedSound,
        },
        priority: 'high',
        sound: false, // disable system notification sound
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          date: trigger,
          seconds: reminder.isRecurring ? 24 * 60 * 60 : undefined,
        },
      });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
        });
      }

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  },

  async handleNotification(notification) {
    const { reminderId } = notification.request.content.data;
    this.notificationEmitter.emit('showNotification', reminderId);
  },

  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async createNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
      });
    }
  },
};

// 👂 Unified Notification Listener
Notifications.addNotificationReceivedListener(async (notification) => {
  const data = notification.request.content.data;
  
  // For Android: Use native service
  if (Platform.OS === 'android') {
      try {
          if (data.audioUri) {
              await Audio.Sound.stopAsync();
              AndroidService.playSound(data.audioUri);
          } else if (data.selectedSound) {
              // Handle default sounds
              const sound = defaultSounds.find(s => s.name === data.selectedSound);
              if (sound) {
                  AndroidService.playSound(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + this.getPackageName() + "/raw/" + sound.name.toLowerCase());
              }
          }
      } catch (error) {
          console.error('Android sound error:', error);
      }
  } else {
      // iOS handling
      if (data.audioUri || data.selectedSound) {
          await playReminderSound(data.audioUri, data.selectedSound);
      }
  }
});
// Call this during app startup
NotificationService.createNotificationChannel();
