import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';
import { Audio } from 'expo-av';
import { defaultSounds } from '../constants/sounds';
import AndroidService from './AndroidService';
import mitt from 'mitt'; // ✅ Replaced 'events' with 'mitt'

const notificationEmitter = mitt(); // ✅ mitt instance

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
        selectedSound: data.selectedSound,
      },
      priority: 'high',
      sound: data.selectedSound || 'default', // Use the selected sound or default
    };

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

  notificationEmitter, // ✅ Exporting mitt instance

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
        categoryIdentifier: 'reminder',
      };

      if (Platform.OS === 'android') {
        notificationContent.sound = 'sound';
      } else if (reminder.selectedSound) {
        notificationContent.sound = reminder.selectedSound.toLowerCase().replace(/\s+/g, '_');
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          date: trigger,
          seconds: reminder.isRecurring ? 24 * 60 * 60 : undefined, // Repeat every 24 hours
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  },

  async handleNotification(notification) {
    const { reminderId } = notification.request.content.data;
    notificationEmitter.emit('showNotification', reminderId); // ✅ Emits via mitt
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
        sound: 'default', // Ensure sound is enabled
        enableVibrate: true,
      });
    }
  },
};

// Prevent system UI from showing native alerts (custom handling only)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Prevent default notification UI
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Listen for notifications
Notifications.addNotificationReceivedListener((notification) => {
  NotificationService.handleNotification(notification);
});

Notifications.addNotificationReceivedListener(async (notification) => {
  const data = notification.request.content.data;
  if (data.audioUri || data.selectedSound) {
    await playReminderSound(data.audioUri, data.selectedSound);
  }
});
