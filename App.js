import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme, DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import RecordScreen from './src/screens/RecordScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Services
import { StorageService } from './src/services/storage';
import { NotificationService } from './src/services/notifications';

const Tab = createBottomTabNavigator();

export default function App() {
  const scheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Ensure default themes are defined before using them
  const basePaperDefault = PaperDefaultTheme || {};
  const basePaperDark = PaperDarkTheme || {};
  const baseNavDefault = NavigationDefaultTheme || {};
  const baseNavDark = NavigationDarkTheme || {};

  // Combine Paper and Navigation themes safely
  const CombinedDefaultTheme = {
    ...basePaperDefault,
    ...baseNavDefault,
    colors: {
      ...(basePaperDefault.colors || {}),
      ...(baseNavDefault.colors || {}),
      primary: '#4A90E2',
      accent: '#03dac4',
      background: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#000000',
      placeholder: '#757575',
      backdrop: 'rgba(0,0,0,0.5)',
      notification: '#f50057',
      card: '#FFFFFF',
      border: '#E0E0E0',
      elevation: {
        level2: 'rgba(0, 0, 0, 0.08)',
        level3: 'rgba(0, 0, 0, 0.12)',
      }
    },
  };

  const CombinedDarkTheme = {
    ...basePaperDark,
    ...baseNavDark,
    colors: {
      ...(basePaperDark.colors || {}),
      ...(baseNavDark.colors || {}),
      primary: '#4A90E2',
      accent: '#03dac4',
      background: '#121212',
      surface: '#1E1E1E',
      text: '#FFFFFF',
      placeholder: '#9E9E9E',
      backdrop: 'rgba(0,0,0,0.5)',
      notification: '#ff79b0',
      card: '#1E1E1E',
      border: '#2C2C2C',
      elevation: {
        level2: 'rgba(255, 255, 255, 0.08)',
        level3: 'rgba(255, 255, 255, 0.12)',
      }
    },
    dark: true,
  };

  useEffect(() => {
    // Load initial theme
    loadTheme();

    // Listen for theme changes
    const themeListener = EventRegister.addEventListener('themeChange', (value) => {
      setIsDarkMode(value);
    });

    return () => {
      EventRegister.removeEventListener(themeListener);
    };
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkMode');
      setIsDarkMode(savedTheme === 'true');
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  // Setup notifications
  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications to use reminders');
      }

      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    };

    setupNotifications();
  }, []);

  const theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme;

  useEffect(() => {
    const setupApp = async () => {
      Notifications.requestPermissionsAsync();
      await NotificationService.requestPermissions();
      await NotificationService.createNotificationChannel();
    };
    
    setupApp();
    
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const reminders = await StorageService.getReminders();
        const now = new Date();

        for (const reminder of reminders) {
          if (new Date(reminder.date) > now && !reminder.notificationId) {
            try {
              const notificationId = await NotificationService.scheduleNotification(reminder);
              reminder.notificationId = notificationId;
              await StorageService.updateReminder(reminder);
            } catch (error) {
              console.error('Error scheduling notification:', error);
            }
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Safety check before using theme.colors
  if (!theme || !theme.colors) {
    console.error('Theme is undefined or missing colors:', theme);
    return null; // or a fallback UI
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              const icons = {
                Home: 'home',
                Record: 'mic',
                Reminders: 'notifications',
                Settings: 'settings',
              };
              return <MaterialIcons name={icons[route.name]} size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Record" component={RecordScreen} />
          <Tab.Screen name="Reminders" component={RemindersScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
