import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const soundEnabled = await StorageService.getItem('soundEnabled');
    return {
      shouldShowAlert: true,
      shouldPlaySound: Platform.OS !== 'web' ? JSON.parse(soundEnabled) : false,
      shouldSetBadge: true,
    };
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
    const trigger = new Date(reminder.date);
    const now = new Date();
    sound: Platform.OS !== 'web' ? true : undefined;

    if (trigger <= now) {
      throw new Error('Cannot schedule notification for past date');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: 'Time for your reminder!',
        sound: true,
      },
      trigger: trigger, // where trigger is a Date object
      // Trigger the notification at the specified date and time
      trigger: {
        repeats: true,
        hour: trigger.getHours(),
        minute: trigger.getMinutes(),
        weekday: trigger.getDay(),
        day: trigger.getDate(),
        date: trigger,
        channelId: 'reminders',
      },
    });

    return notificationId;
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
      });
    }
  },
};