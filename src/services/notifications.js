import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';
import { Audio } from 'expo-av';
import { defaultSounds } from '../constants/sounds';
import AndroidService from './AndroidService';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    if (Platform.OS === 'android') {
      AndroidService.startService();
    }

    if (data.reminderId) {
      await NotificationService.cancelNotification(data.reminderId);
    }

    const trigger = new Date(data.date);
    if (trigger <= new Date()) {
      throw new Error('Cannot schedule notification for past date');
    }

    let notificationContent = {
      title: data.title,
      body: 'Time for your reminder!',
      data: { 
        reminderId: data.reminderId,
        audioUri: data.audioUri,
        selectedSound: data.selectedSound
      },
      priority: 'high',
    };

    // Handle sound configuration
    if (data.selectedSound) {
      // For default sounds, use the system notification sound
      notificationContent.sound = data.selectedSound.toLowerCase().replace(/\s+/g, '_');
    } else if (data.audioUri) {
      // For recorded sounds, we'll play them manually when notification is received
      notificationContent.sound = 'null'; // Prevent default system sound
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        date: trigger,
        seconds: data.isRecurring ? 24 * 60 * 60 : undefined,
      },
    });

    if (Platform.OS === 'android') {
      AndroidService.stopService();
    }

    return notificationId;
  },
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

      let notificationContent = {
        title: reminder.title,
        body: 'Time for your reminder!',
        data: { 
          reminderId: reminder.id,
          audioUri: reminder.audioUri,
          selectedSound: reminder.selectedSound
        },
        priority: 'high',
      };

      // Handle sound configuration
      if (reminder.selectedSound) {
        // For default sounds, use the system notification sound
        notificationContent.sound = reminder.selectedSound.toLowerCase().replace(/\s+/g, '_');
      } else if (reminder.audioUri) {
        // For recorded sounds, we'll play them manually when notification is received
        notificationContent.sound = 'null'; // Prevent default system sound
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
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
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4A90E2',
        sound: true,
        enableVibrate: true,
      });
    }
  },
};