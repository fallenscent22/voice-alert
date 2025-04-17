import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, AppState, Platform } from 'react-native';
import { Text, Button, Card, IconButton, Portal, Dialog, Paragraph, Modal } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { defaultSounds } from '../constants/sounds';
import { useTheme } from '@react-navigation/native';
import AndroidService from '../services/AndroidService';
import { NotificationService } from '../services/notifications';

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
    const handleShowNotification = async (reminderId) => {
      const reminder = await StorageService.getReminder(reminderId);
      setCurrentReminder(reminder);
      setVisible(true);

      if (reminder.audioUri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: reminder.audioUri },
          { shouldPlay: true }
        );
        setSound(newSound);
      }
    };

    NotificationService.notificationEmitter.on('showNotification', handleShowNotification);

    return () => {
      NotificationService.notificationEmitter.off('showNotification', handleShowNotification);
    };
  }, []);

  const loadReminders = async () => {
    const data = await StorageService.getReminders();
    setReminders(data || []);
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

  const handleSnooze = async () => {
    if (currentReminder) {
      const snoozeDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes later
      await NotificationService.scheduleNotification({
        ...currentReminder,
        date: snoozeDate,
      });
      Alert.alert('Snoozed', 'Reminder snoozed for 15 minutes.');
    }
    handleStop();
  };

  const handleStop = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setVisible(false);
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
        <Modal visible={visible} onDismiss={handleStop} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{currentReminder?.title}</Text>
          <Text style={styles.modalBody}>Time for your reminder!</Text>
          <View style={styles.modalActions}>
            <Button mode="contained" onPress={handleSnooze} style={styles.snoozeButton}>
              Snooze
            </Button>
            <Button mode="contained" onPress={handleStop} style={styles.stopButton}>
              Stop
            </Button>
          </View>
        </Modal>
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
    marginBottom: 16,
    elevation: 2,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  snoozeButton: {
    flex: 1,
    marginRight: 8,
  },
  stopButton: {
    flex: 1,
    marginLeft: 8,
  },
});
