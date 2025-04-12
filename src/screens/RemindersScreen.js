import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, AppState } from 'react-native';
import { Text, Button, Card, IconButton, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { defaultSounds } from '../constants/sounds';
import { useTheme } from '@react-navigation/native';

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
      await playReminderSound(reminder.audioUri || reminder.selectedSound, reminder.selectedSound);
    }
  };

  const handleNotificationResponse = async (response) => {
    const reminderId = response.notification.request.content.data.reminderId;
    const action = response.actionIdentifier;

    if (action === 'SNOOZE') {
      snoozeReminder(reminderId);
    } else if (action === 'STOP') {
      stopReminder(reminderId);
    }
  };

  const snoozeReminder = async (reminderId) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    const newDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes later
    const newNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: 'Reminder Snoozed',
        data: { reminderId: reminder.id },
      },
      trigger: newDate,
    });

    reminder.date = newDate;
    reminder.notificationId = newNotificationId;

    await StorageService.updateReminder(reminder);
    loadReminders();
    stopPlayingSound();
    setVisible(false);
  };

  const stopReminder = async (reminderId) => {
    stopPlayingSound();
    setVisible(false);
    await Notifications.cancelAllScheduledNotificationsAsync(); // optional: or cancel specific one
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
              onPress={() => snoozeReminder(currentReminder.id)}
              textColor={theme.colors.primary}
            >
              Snooze 15 mins
            </Button>
            <Button
              onPress={() => stopReminder(currentReminder.id)}
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
