import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';
import { defaultSounds } from '../constants/sounds';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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

  async scheduleNotification(reminder) {
    try {
      if (reminder.notificationId) {
        await this.cancelNotification(reminder.notificationId);
      }

      const trigger = new Date(reminder.date);
      
      if (trigger <= new Date()) {
        throw new Error('Cannot schedule notification for past date');
      }

      // Get the sound file based on the selected sound
      let soundName = 'default';
      if (reminder.selectedSound) {
        const sound = defaultSounds.find(s => s.name === reminder.selectedSound);
        if (sound) {
          soundName = sound.file;
        }
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: 'Time for your reminder!',
          sound: soundName,
          priority: 'high',
          data: { 
            reminderId: reminder.id,
            audioUri: reminder.audioUri,
            selectedSound: reminder.selectedSound
          },
        },
        trigger: {
          date: trigger,
          seconds: reminder.isRecurring ? 24 * 60 * 60 : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  },

  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async createNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4A90E2',
        sound: true,
        enableVibrate: true,
      });
    }
  },
};