import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme, DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, useColorScheme } from 'react-native';

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

  // Combine Paper and Navigation themes
  const CombinedDefaultTheme = {
    ...PaperDefaultTheme,
    ...NavigationDefaultTheme,
    colors: {
      ...PaperDefaultTheme.colors,
      ...NavigationDefaultTheme.colors,
      primary: '#6200ee',
      accent: '#03dac4',
      background: '#f6f6f6',
    },
  };

  const CombinedDarkTheme = {
    ...PaperDarkTheme,
    ...NavigationDarkTheme,
    colors: {
      ...PaperDarkTheme.colors,
      ...NavigationDarkTheme.colors,
      primary: '#bb86fc',
      accent: '#03dac4',
      background: '#121212',
    },
  };

  const theme = scheme === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme;

  useEffect(() => {
    const setupApp = async () => {
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
