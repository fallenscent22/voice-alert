import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, AppState, Platform } from 'react-native';
import { Text, Button, Card, IconButton, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { defaultSounds } from '../constants/sounds';
import { useTheme } from '@react-navigation/native';
import AndroidService from '../services/AndroidService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RemindersScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [reminders, setReminders] = useState([]);
  const [currentReminder, setCurrentReminder] = useState(null);
  const [visible, setVisible] = useState(false);
  const [sound, setSound] = useState(null);
  const appState = useRef(AppState.currentState);
  const theme = useTheme();

  useEffect(() => {
    if (isFocused) loadReminders();
  }, [isFocused]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(handleNotification);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      subscription.remove();
      responseSubscription.remove();
      if (sound) {
        sound.stopAsync();
        sound.unloadAsync();
      }
    };
  }, []);

  const loadReminders = async () => {
    const data = await StorageService.getReminders();
    setReminders(data || []);
  };

  const handleNotification = async (notification) => {
    const reminderId = notification.request.content.data.reminderId;
    const reminder = await StorageService.getReminder(reminderId);
    if (reminder) {
      setCurrentReminder(reminder);
      setVisible(true);
      await playReminderSound(reminder.audioUri, reminder.selectedSound);
    }
  };

  const handleNotificationResponse = async (response) => {
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

      // Schedule new notification 15 minutes later
      const newDate = new Date(Date.now() + 15 * 60 * 1000);
      const newReminder = {
        ...reminder,
        date: newDate.getTime(),
      };

      const notificationId = await scheduleNotification(newReminder);
      if (notificationId) {
        newReminder.notificationId = notificationId;
        await StorageService.updateReminder(newReminder);
        await stopPlayingSound();
      }
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  };

  const handleStop = async (reminderId) => {
    try {
      const reminder = await StorageService.getReminder(reminderId);
      if (reminder?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }
      await stopPlayingSound();
    } catch (error) {
      console.error('Error stopping reminder:', error);
    }
  };

  const scheduleNotification = async (reminder) => {
    try {
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }

      const triggerDate = new Date(reminder.date);
      if (triggerDate <= new Date()) {
        Alert.alert('Invalid Date', 'Please select a future date and time.');
        return false;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: 'Time for your reminder!',
          data: { 
            reminderId: reminder.id,
            audioUri: reminder.audioUri,
            selectedSound: reminder.selectedSound
          },
          sound: true,
          priority: 'max',
          categoryIdentifier: 'reminder',
          // Android specific
          android: {
            channelId: 'reminders',
            priority: 'max',
            sticky: true,
            fullScreenIntent: true, // This makes it appear on screen
          },
        },
        trigger: {
          date: triggerDate,
          seconds: reminder.isRecurring ? 24 * 60 * 60 : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Failed to schedule notification');
      return false;
    }
  };

  const stopPlayingSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  const playReminderSound = async (uri, selectedSound) => {
    try {
      await stopPlayingSound();
      
      // Start foreground service for Android
      if (Platform.OS === 'android') {
        AndroidService.startService();
      }
      
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
        throw new Error('Sound source not found');
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
            AndroidService.stopService();
          }
        }
      });
      
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play reminder sound');
    }
  };

  const deleteReminder = async (reminderId) => {
    await StorageService.deleteReminder(reminderId);
    loadReminders();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Title
              title={item.title}
              subtitle={new Date(item.date).toLocaleString()}
              titleStyle={{ color: theme.colors.text }}
              subtitleStyle={{ color: theme.colors.subtext }}
            />
            <Card.Actions>
              <IconButton 
                icon="play" 
                iconColor={theme.colors.primary}
                onPress={() => playReminderSound(item.audioUri, item.selectedSound)} 
              />
              <IconButton
                icon="pencil"
                iconColor={theme.colors.primary}
                onPress={() => navigation.navigate('Record', { reminder: item })}
              />
              <IconButton
                icon="delete"
                iconColor={theme.colors.primary}
                onPress={() => deleteReminder(item.id)}
              />
            </Card.Actions>
          </Card>
        )}
      />

      <Portal>
        <Dialog
          visible={visible}
          onDismiss={() => setVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>
            {currentReminder?.title}
          </Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ color: theme.colors.text }}>
              It's time for your reminder!
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => handleSnooze(currentReminder.id)}
              textColor={theme.colors.primary}
            >
              Snooze 15 mins
            </Button>
            <Button
              onPress={() => handleStop(currentReminder.id)}
              textColor={theme.colors.primary}
            >
              Stop
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginVertical: 8,
    elevation: 4,
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    marginLeft: 8,
  },
  dialog: {
    borderRadius: 12,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dialogActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
