import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const soundEnabled = JSON.parse(await AsyncStorage.getItem('soundEnabled'));
    return {
      shouldShowAlert: true,
      shouldPlaySound: soundEnabled,
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

    if (trigger <= now) {
      throw new Error('Cannot schedule notification for past date');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: 'Time for your reminder!',
        sound: true,
      },
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