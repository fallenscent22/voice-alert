import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme, DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, useColorScheme } from 'react-native';
import { ThemeProvider, ThemeContext } from './src/contexts/ThemeContext';

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
    primary: '#6200ee',
    accent: '#03dac4',
    background: '#f6f6f6',
  },
};

const CombinedDarkTheme = {
  ...basePaperDark,
  ...baseNavDark,
  colors: {
    ...(basePaperDark.colors || {}),
    ...(baseNavDark.colors || {}),
    primary: '#bb86fc',
    accent: '#03dac4',
    background: '#121212',
  },
};

  const theme = scheme === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme;

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
