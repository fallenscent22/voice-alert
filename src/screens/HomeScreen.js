import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, Button, Portal, Modal } from 'react-native-paper';
import { useNavigation, useTheme, useIsFocused } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { Audio } from 'expo-av';
import { defaultSounds } from '../constants/sounds';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [reminders, setReminders] = useState([]);
  const [currentReminder, setCurrentReminder] = useState(null);
  const [visible, setVisible] = useState(false);
  const [sound, setSound] = useState(null);
  const isFocused = useIsFocused();
  const theme = useTheme();

  useEffect(() => {
    if (isFocused) {
      loadReminders();
    }
  }, [isFocused]);

  useEffect(() => {
    const handleNotification = async (reminderId) => {
      try {
        const reminder = await StorageService.getReminder(reminderId);
        console.log('Playing sound from URI:', reminder.audioUri);
        setCurrentReminder(reminder);
        setVisible(true);

        let soundSource = null;
        if (reminder.audioUri) {
          soundSource = { uri: reminder.audioUri };
        } else if (reminder.selectedSound) {
          const defaultSound = defaultSounds.find(s => s.name === reminder.selectedSound);
          if (defaultSound) {
            soundSource = defaultSound.file; // Use require() from defaultSounds
          }
        }

        if (!soundSource) {
          console.warn('No sound source available');
          return;
        }

        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }

        // Request audio permissions
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Audio permissions not granted');
          return;
        }

        // Load and play the new sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          soundSource,
          { shouldPlay: true }
        );
        setSound(newSound);
      } catch (error) {
        console.error('Error handling notification sound:', error);
      }
    };

    NotificationService.notificationEmitter.on('showNotification', handleNotification);

    return () => {
      NotificationService.notificationEmitter.off('showNotification', handleNotification);
    };
  }, [sound]);

  const handleSnooze = async () => {
    if (currentReminder) {
      const snoozeDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes later
      const notificationId = await NotificationService.scheduleNotification({
        ...currentReminder,
        date: snoozeDate,
      });
      const updatedReminder = {
        ...currentReminder,
        notificationId,
        date: snoozeDate.getTime(),
      };
      await StorageService.saveReminder(updatedReminder);
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

  const loadReminders = async () => {
    try {
      const loadedReminders = await StorageService.getReminders();
      setReminders(loadedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={reminders}
        renderItem={({ item }) => (
          <Card
            style={[styles.reminderCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('Record', { reminder: item })}
          >
            <Card.Content>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold' }}>
                {item.title}
              </Text>
              <Text style={{ color: theme.colors.subtext, marginTop: 4 }}>
                {new Date(item.date).toLocaleString()}
              </Text>
              {item.isRecurring && (
                <Text style={{ color: theme.colors.primary, marginTop: 4 }}>
                  Recurring
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.buttonText}
        onPress={() => navigation.navigate('Record')}
      />

      {/* Notification Modal */}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  listContainer: {
    padding: 8,
  },
  reminderCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
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

export default HomeScreen;
