import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDERS_KEY = '@vocal_reminder_reminders';

// Web-specific storage implementation
const webStorage = {
  async getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from localStorage:', error);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in localStorage:', error);
      throw error;
    }
  },
};

// Use webStorage for web platform, AsyncStorage for native platforms
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

 export const StorageService = {
  async getItem(key) {
    try {
      return await storage.getItem(key);
    } catch (error) {
      console.error(`Error getting item "${key}":`, error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      return await storage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting item "${key}":`, error);
      throw error;
    }
  },

  async saveReminder(reminder) {
    try {
      const reminders = await this.getReminders();
      reminders.push(reminder);
      await storage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminder:', error);
      throw error;
    }
  },

  async getReminders() {
    try {
      const remindersJson = await storage.getItem(REMINDERS_KEY);
      if (!remindersJson) {
        return [];
      }
      const reminders = JSON.parse(remindersJson);
      return reminders.map(reminder => ({
        ...reminder,
        date: new Date(reminder.date).getTime(), // Store as timestamp
      })).sort((a, b) => a.date - b.date);
    } catch (error) {
      console.error('Error getting reminders:', error);
      return [];
    }
  },

  async getReminder(id) {
    try {
      const reminders = await this.getReminders();
      return reminders.find(reminder => reminder.id === id);
    } catch (error) {
      console.error('Error getting reminder by ID:', error);
      return null;
    }
  },

  async deleteReminder(id) {
    try {
      const reminders = await this.getReminders();
      const reminderToDelete = reminders.find((reminder) => reminder.id === id);

      if (reminderToDelete?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminderToDelete.notificationId);
      }

      const updatedReminders = reminders.filter((reminder) => reminder.id !== id);
      await storage.setItem(REMINDERS_KEY, JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  },

  async updateReminder(reminder) {
    try {
      const reminders = await this.getReminders();
      const index = reminders.findIndex(r => r.id === reminder.id);
      
      if (index !== -1) {
        // Cancel old notification if exists
        if (reminders[index].notificationId) {
          await Notifications.cancelScheduledNotificationAsync(reminders[index].notificationId);
        }
        
        // Replace the old reminder with the new one
        reminders[index] = {
          ...reminder,
          date: reminder.date instanceof Date ? reminder.date.getTime() : reminder.date
        };
        
        await storage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  },
};
