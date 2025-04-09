import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
      const mappedReminders = reminders.map(reminder => ({
        ...reminder,
        date: new Date(reminder.date),
      }));

      // Sort by upcoming date
      mappedReminders.sort((a, b) => a.date - b.date);
      return mappedReminders;
    } catch (error) {
      console.error('Error getting reminders:', error);
      return [];
    }
  },

  async deleteReminder(id) {
    try {
      const reminders = await this.getReminders();
      const updatedReminders = reminders.filter(reminder => reminder.id !== id);
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
        reminders[index] = reminder;
        await storage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  },
};
