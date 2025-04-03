import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Switch, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../services/notifications';

const SettingsScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifications = await AsyncStorage.getItem('notificationsEnabled');
      const dark = await AsyncStorage.getItem('darkMode');
      const sound = await AsyncStorage.getItem('soundEnabled');

      if (notifications !== null) setNotificationsEnabled(JSON.parse(notifications));
      if (dark !== null) setDarkMode(JSON.parse(dark));
      if (sound !== null) setSoundEnabled(JSON.parse(sound));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleNotifications = async (value) => {
    try {
      setNotificationsEnabled(value);
      await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(value));
      if (!value) {
        await NotificationService.cancelAllNotifications();
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const toggleDarkMode = async (value) => {
    try {
      setDarkMode(value);
      await AsyncStorage.setItem('darkMode', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving dark mode settings:', error);
    }
  };

  const toggleSound = async (value) => {
    try {
      setSoundEnabled(value);
      await AsyncStorage.setItem('soundEnabled', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving sound settings:', error);
    }
  };

  return (
    <View style={styles.container}>
      <List.Section>
        <List.Subheader>Notifications</List.Subheader>
        <List.Item
          title="Enable Notifications"
          description="Receive reminders and alerts"
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              color="#6200ee"
            />
          )}
        />
        <Divider />
        <List.Item
          title="Sound"
          description="Play sound when reminder triggers"
          right={() => (
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              color="#6200ee"
            />
          )}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Dark Mode"
          description="Use dark theme"
          right={() => (
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              color="#6200ee"
            />
          )}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="Version"
          description="1.0.0"
          left={props => <List.Icon {...props} icon="information" />}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
});

export default SettingsScreen; 