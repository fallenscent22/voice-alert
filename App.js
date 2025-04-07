import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { AppState } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import RecordScreen from './src/screens/RecordScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { StorageService } from './src/services/storage';
import { NotificationService } from './src/services/notifications';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac4',
    background: '#f6f6f6',
  },
};

export default function App() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const reminders = await StorageService.getReminders();
        const now = new Date();
  
        for (const reminder of reminders) {
          if (reminder.date > now && !reminder.notificationId) {
            try {
              const notificationId = await NotificationService.scheduleNotification(reminder);
              reminder.notificationId = notificationId;
            } catch (error) {
              console.error('Error scheduling notification:', error);
            }
          }
        }
  
        await AsyncStorage.setItem('@vocal_reminder_reminders', JSON.stringify(reminders));
      }
    });
  
    return () => subscription.remove();
  }, []);
  // Load reminders and schedule notifications when the app starts
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              switch (route.name) {
                case 'Home':
                  iconName = 'home';
                  break;
                case 'Record':
                  iconName = 'mic';
                  break;
                case 'Reminders':
                  iconName = 'notifications';
                  break;
                case 'Settings':
                  iconName = 'settings';
                  break;
                default:
                  iconName = 'error';
              }

              return <MaterialIcons name={iconName} size={size} color={color} />;
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