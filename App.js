import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme, DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, useColorScheme, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import { EventRegister } from 'react-native-event-listeners';
import { defaultSounds } from './src/constants/sounds';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import RecordScreen from './src/screens/RecordScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Services
import { StorageService } from './src/services/storage';
import { NotificationService } from './src/services/notifications';
import AndroidService from './src/services/AndroidService'; // Fix the import path

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json'; // Ensure app.json exists and has the correct "name"

AppRegistry.registerComponent(appName, () => App);

const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: 'max',
    presentationOptions: ['alert', 'sound'],
  }),
});

export default function App() {
  const scheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sound, setSound] = useState(null);

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
      subtext: '#E0E0E0',  // For secondary text
      placeholder: '#9E9E9E',
      backdrop: 'rgba(0,0,0,0.5)',
      notification: '#ff79b0',
      card: '#1E1E1E',
      border: '#2C2C2C',
      button: '#4A90E2',
      buttonText: '#FFFFFF',
      tabBar: '#1E1E1E',
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

  // Update the audio configuration
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          staysActiveInBackground: true,
          // Fix iOS interruption mode
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error configuring audio:', error);
      }
    };

    configureAudio();
  }, []);

  // Configure notification categories/channels with actions
  useEffect(() => {
    const setupNotifications = async () => {
      // Set up notification actions
      await Notifications.setNotificationCategoryAsync('reminder', [
        {
          identifier: 'SNOOZE',
          buttonTitle: 'Snooze (15min)',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'STOP',
          buttonTitle: 'Stop',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ]);

      // Set up Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: true,
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });
      }
    };

    setupNotifications();
  }, []);

  // Add notification handlers
  const handleNotification = async (notification) => {
    const data = notification.request.content.data;
    
    try {
      // Start Android service for background audio
      if (Platform.OS === 'android') {
        AndroidService.startService();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
      });

      await playReminderSound(data.audioUri, data.selectedSound);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const playReminderSound = async (uri, selectedSound) => {
    try {
      await stopPlayingSound();
      
      let soundSource;
      if (uri && uri.startsWith('file:')) {
        soundSource = { uri };
      } else if (selectedSound) {
        const defaultSound = defaultSounds.find(s => s.name === selectedSound);
        if (defaultSound) {
          soundSource = defaultSound.file;
        }
      }

      if (!soundSource) {
        console.error('Sound source not found');
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true, volume: 1.0 }
      );
      setSound(newSound);
      
      // Add completion handler
      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await stopPlayingSound();
          if (Platform.OS === 'android') {
            //AndroidService.stopService();
            await AndroidService.stopService();            
          }
        }
      });
      
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const stopPlayingSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  const handleNotificationResponse = async (response) => {
    // Handle notification interaction
    const data = response.notification.request.content.data;
    const actionId = response.actionIdentifier;

    if (actionId === 'SNOOZE') {
      await handleSnooze(data.reminderId);
    } else if (actionId === 'STOP') {
      await handleStop(data.reminderId);
    }
  };

  const handleSnooze = async (reminderId) => {
    try {
      const reminder = await StorageService.getReminder(reminderId);
      if (!reminder) return;

      // Cancel current notification
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }

      // Stop current sound
      await stopPlayingSound();

      // Schedule new notification 15 minutes later
      const newDate = new Date();
      newDate.setMinutes(newDate.getMinutes() + 15);
      
      const notificationId = await NotificationService.scheduleNotification({
        ...reminder,
        date: newDate.toISOString(),
      });
      
      reminder.notificationId = notificationId;
      await StorageService.updateReminder(reminder);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  };

  const handleStop = async (reminderId) => {
    try {
      const reminder = await StorageService.getReminder(reminderId);
      if (!reminder) return;

      // Cancel current notification
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }

      // Stop current sound
      await stopPlayingSound();
      
      // Update reminder to mark it as completed
      reminder.completed = true;
      await StorageService.updateReminder(reminder);
    } catch (error) {
      console.error('Error stopping reminder:', error);
    }
  };

  const theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme;

  useEffect(() => {
    const setupApp = async () => {
      Notifications.requestPermissionsAsync();
      await NotificationService.requestPermissions();
      await NotificationService.createNotificationChannel();
      
      // Initialize Android service for background audio
      if (Platform.OS === 'android') {
        AndroidService.startService();
      }
    };
    
    setupApp();
    
    // Register notification listeners
    const notificationReceivedSubscription = Notifications.addNotificationReceivedListener(handleNotification);
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    
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
      notificationReceivedSubscription.remove();
      notificationResponseSubscription.remove();
      // Cleanup service on app unmount
      if (Platform.OS === 'android') {
        AndroidService.stopService();
      }
      // Clean up sound
      stopPlayingSound();
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
