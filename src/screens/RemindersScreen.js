import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, AppState } from 'react-native';
import { Text, Button, Card, IconButton, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RemindersScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [reminders, setReminders] = useState([]);
  const [currentReminder, setCurrentReminder] = useState(null);
  const [visible, setVisible] = useState(false);
  const [sound, setSound] = useState(null);
  const appState = useRef(AppState.currentState);

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
    const reminder = reminders.find(r => r.id === reminderId);
    if (reminder) {
      setCurrentReminder(reminder);
      setVisible(true);
      playReminderSound(reminder.audioUri);
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

  const playReminderSound = async (uri) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        typeof uri === 'string' && uri.startsWith('file:')
          ? { uri }
          : uri
      );
      setSound(sound);
      await sound.playAsync();
    } catch (e) {
      Alert.alert('Error', 'Failed to play reminder sound.');
    }
  };

  const deleteReminder = async (reminderId) => {
    await StorageService.deleteReminder(reminderId);
    loadReminders();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title title={item.title} subtitle={new Date(item.date).toLocaleString()} />
            <Card.Actions>
              <IconButton icon="play" onPress={() => playReminderSound(item.audioUri)} />
              <IconButton icon="pencil" onPress={() => navigation.navigate('Record', { reminder: item })} />
              <IconButton icon="delete" onPress={() => deleteReminder(item.id)} />
            </Card.Actions>
          </Card>
        )}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>{currentReminder?.title}</Dialog.Title>
          <Dialog.Content>
            <Paragraph>It's time for your reminder!</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => snoozeReminder(currentReminder.id)}>Snooze 15 mins</Button>
            <Button onPress={() => stopReminder(currentReminder.id)}>Stop</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  card: {
    marginVertical: 8,
  },
});
