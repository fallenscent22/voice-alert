import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { List, Switch, Divider, useTheme } from 'react-native-paper';
import { StorageService } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../services/notifications';
import { EventRegister } from 'react-native-event-listeners';

const SettingsScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifications = await StorageService.getItem('notificationsEnabled');
      // Uncomment the following line(below) if you want to use AsyncStorage for notifications
      //const notifications = await AsyncStorage.getItem('notificationsEnabled');
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
      //await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(value));
      await StorageService.setItem('notificationsEnabled', JSON.stringify(value));
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
      await AsyncStorage.setItem('darkMode', value.toString());
      EventRegister.emit('themeChange', value);
    } catch (error) {
      console.error('Error saving dark mode settings:', error);
    }
  };

  const toggleSound = async (value) => {
    try {
      setSoundEnabled(value);
      //await AsyncStorage.setItem('soundEnabled', JSON.stringify(value));
      await StorageService.setItem('soundEnabled', JSON.stringify(value));
      {/*if (value) {
        await NotificationService.enableSound();
      } else {
        await NotificationService.disableSound();
      }*/}
      // Uncomment the above lines if you have methods to enable/disable sound in NotificationService
    } catch (error) {
      console.error('Error saving sound settings:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
        <List.Subheader style={{ color: theme.colors.text }}>Notifications</List.Subheader>
        <List.Item
          title="Enable Notifications"
          description="Receive reminders and alerts"
          titleStyle={{ color: theme.colors.text }}
          descriptionStyle={{ color: theme.colors.subtext }}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              color={theme.colors.button}
            />
          )}
        />
        <Divider style={{ backgroundColor: theme.colors.border }} />
        <List.Item
          title="Sound"
          description="Play sound when reminder triggers"
          titleStyle={{ color: theme.colors.text }}
          descriptionStyle={{ color: theme.colors.subtext }}
          right={() => (
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              color={theme.colors.button}
            />
          )}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.text }}>Appearance</List.Subheader>
        <List.Item
          title="Dark Mode"
          description="Use dark theme"
          titleStyle={{ color: theme.colors.text }}
          descriptionStyle={{ color: theme.colors.subtext }}
          right={() => (
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              color={theme.colors.button}
            />
          )}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.text }}>About</List.Subheader>
        <List.Item
          title="Version"
          description="1.0.0"
          titleStyle={{ color: theme.colors.text }}
          descriptionStyle={{ color: theme.colors.subtext }}
          left={props => <List.Icon {...props} icon="information" color={theme.colors.text} />}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});

export default SettingsScreen; 