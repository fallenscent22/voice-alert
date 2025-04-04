import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, IconButton, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';

const RemindersScreen = () => {
  const navigation = useNavigation();
  const [reminders, setReminders] = useState([]);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    loadReminders();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadReminders = async () => {
    try {
      const loadedReminders = await StorageService.getReminders();
      setReminders(loadedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const playAudio = async (uri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      await newSound.playAsync();
    } catch (err) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const deleteReminder = async (id) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteReminder(id);
              await NotificationService.cancelNotification(id);
              setReminders(reminders.filter((r) => r.id !== id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reminder');
            }
          },
        },
      ]
    );
  };

  const renderReminder = ({ item }) => (
    <Card style={styles.reminderCard}>
      <Card.Content>
        <View style={styles.reminderHeader}>
          <Text variant="titleMedium">{item.title}</Text>
          <IconButton
            icon="delete"
            size={20}
            onPress={() => deleteReminder(item.id)}
          />
        </View>
        <Text variant="bodyMedium">
          {new Date(item.date).toLocaleString()}
        </Text>
        {item.isRecurring && (
          <Text variant="bodySmall" style={styles.recurringText}>
            Recurring
          </Text>
        )}
        <IconButton
          icon="play"
          size={24}
          onPress={() => playAudio(item.audioUri)}
          style={styles.playButton}
        />
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders}
        renderItem={renderReminder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Record')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  listContainer: {
    padding: 16,
  },
  reminderCard: {
    marginBottom: 12,
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurringText: {
    color: '#6200ee',
    marginTop: 4,
  },
  playButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default RemindersScreen; 