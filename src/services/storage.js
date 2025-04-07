import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDERS_KEY = '@vocal_reminder_reminders';

export const StorageService = {
  async saveReminder(reminder) {
    try {
      const reminders = await this.getReminders();
      reminders.push(reminder);
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminder:', error);
      throw error;
    }
  },

  async getReminders() {
    try {
      const remindersJson = await AsyncStorage.getItem(REMINDERS_KEY);
      if (!remindersJson) {
        return [];
      }
      const reminders = JSON.parse(remindersJson);
      const mappedReminders = reminders.map(reminder => ({
      //return reminders.map(reminder => ({
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
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updatedReminders));
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
        await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  },
}; 