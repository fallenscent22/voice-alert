import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, TextInput, Switch, Portal, Modal, useTheme } from 'react-native-paper';
import { Audio } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import * as Notifications from 'expo-notifications';
import AndroidService from '../services/AndroidService';

const defaultSounds = [
  {id: '1', name: 'Anime Wow', file: require('../../assets/sounds/Animewow.mp3')},
  {id: '2', name: 'Bird', file: require('../../assets/sounds/Bird.mp3')},
  {id: '3', name: 'Birds Chirping', file: require('../../assets/sounds/BirdsChirping.mp3')},
  {id: '4', name: 'Die With A Smile', file: require('../../assets/sounds/DieWithASmile.mp3')},
  {id: '5', name: 'Gun Shot', file: require('../../assets/sounds/GunShot.mp3')},
  {id: '6', name: 'iphone 16 Pro Max', file: require('../../assets/sounds/Iphone16ProMaxRingtone.mp3')},
  {id: '7', name: 'Money Heist', file: require('../../assets/sounds/IphoneMoneyHeistRingtone.mp3')},
  {id: '8', name: 'JARVIS Alarm', file: require('../../assets/sounds/jarvisalarm.mp3')},
  {id: '9', name: 'Minions Wakeup', file: require('../../assets/sounds/minionswakeup.mp3')},
  {id: '10', name: 'Retro Game Alarm', file: require('../../assets/sounds/mixkitretrogameemergencyalarm.wav')},
  {id: '11', name: 'One Love', file: require('../../assets/sounds/OneLove.mp3')},
  {id: '12', name: 'Simple Notification', file: require('../../assets/sounds/simplenotification.mp3')},
  {id: '13', name: 'Vine Boom', file: require('../../assets/sounds/vineboom.mp3')}
];

const RecordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [playingSound, setPlayingSound] = useState(null);
  const [selectedSound, setSelectedSound] = useState(null); 
  const [isEditing, setIsEditing] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);

// Stop & unload sound helper
useEffect(() => {
  if (route.params?.reminder) {
    const { reminder } = route.params;
    setTitle(reminder.title);
    setDate(new Date(reminder.date));
    setIsRecurring(reminder.isRecurring);
    setAudioUri(reminder.audioUri);
    setSelectedSound(reminder.selectedSound ? { name: reminder.selectedSound, type: 'default' } : null);
    setIsEditing(true);
    setEditingReminderId(reminder.id);
  }

  const unsubscribe = navigation.addListener('beforeRemove', () => {
    cleanup();
  });

  return () => {
    unsubscribe();
    cleanup();
  };
}, []);

const cleanup = async () => {
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    }
    if (playingSound) {
      await playingSound.stopAsync();
      await playingSound.unloadAsync();
      setPlayingSound(null);
    }
  } catch (error) {
    console.error("Cleanup error:", error);
  }
};


  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow microphone access to record reminders.');
        return;
      }

      await cleanup();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
      setSelectedSound(null); // unselect default sound if manual recording is made
    } catch (err) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const scheduleNotification = async (reminder) => {
    try {
      // Cancel any existing notification for this reminder
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }

      // Ensure the date is in the future
      const triggerDate = new Date(reminder.date);
      if (triggerDate <= new Date()) {
        Alert.alert('Invalid Date', 'Please select a future date and time.');
        return false;
      }

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: 'Time for your reminder!',
          sound: true, // Enable sound
          priority: 'high',
          data: { 
            reminderId: reminder.id,
            audioUri: reminder.audioUri,
            selectedSound: reminder.selectedSound
          },
        },
        trigger: {
          date: triggerDate,
          seconds: reminder.isRecurring ? 24 * 60 * 60 : undefined, // If recurring, repeat daily
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Failed to schedule notification');
      return false;
    }
  };

  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


  const saveReminder = async () => {
    if (!title || !date || (!audioUri && !selectedSound)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await cleanup();
      
      const reminder = {
        id: editingReminderId || generateUniqueId(),
        title,
        date: date.getTime(), // Store as timestamp instead of Date object
        isRecurring,
        audioUri: audioUri,
        selectedSound: selectedSound?.name || null,
      };

      const notificationId = await scheduleNotification(reminder);
      if (!notificationId) return;

      reminder.notificationId = notificationId;
      await StorageService.saveReminder(reminder);
      
      Alert.alert('Success', 'Reminder saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', 'Failed to save reminder');
    }
  };

  const selectDefaultSound = async (soundFile, soundName) => {
    if (isRecording) return;
    try {
      await cleanup();
      
      // Configure audio mode first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      if (Platform.OS === 'android') {
        AndroidService.startService();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        { shouldPlay: true, volume: 1.0 }
      );
      setPlayingSound(sound);
      
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await cleanup();
          if (Platform.OS === 'android') {
            AndroidService.stopService();
          }
        }
      });
      
      await sound.playAsync();

      setSelectedSound({
        type: 'default',
        name: soundName,
        file: soundFile,
      });
    } catch (error) {
      console.error('Sound playback error:', error);
      Alert.alert('Error', 'Failed to play sound');
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TextInput
        label="Reminder Title"
        value={title}
        onChangeText={setTitle}
        style={[styles.input,{ borderColor: theme.colors.primary }]}
        theme={{ colors: {
          text: theme.colors.text,
          primary: theme.colors.primary, // active label & underline color
          placeholder: theme.colors.placeholder,
          background: 'transparent',}}
        }
        textColor={theme.colors.text}
        placeholderTextColor={theme.colors.placeholder}
      />

      <Button
        mode="outlined"
        onPress={() => {
          setPickerMode('date');
          setShowPicker(true);
        }}
        style={[styles.dateButton, { borderColor: theme.colors.primary }]}
        textColor={theme.colors.text}
      >
        {date.toDateString()}
      </Button>

      <Button
        mode="outlined"
        onPress={() => {
          setPickerMode('time');
          setShowPicker(true);
        }}
        style={[styles.dateButton, { borderColor: theme.colors.primary }]}
        textColor={theme.colors.text}
      >
        {date.toLocaleTimeString()}
      </Button>

      <View style={styles.switchContainer}>
        <Text style={{ color: theme.colors.text }}>Recurring Reminder</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          color={theme.colors.primary}
        />
      </View>

      <View style={styles.recordingContainer}>
        <Button
          mode="contained"
          onPress={isRecording ? stopRecording : startRecording}
          icon={isRecording ? 'stop' : 'microphone'}
          style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </View>

      <Text style={{ marginVertical: 12, color: theme.colors.text }}>
        Or choose a default sound:
      </Text>
      <FlatList
        data={defaultSounds}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.soundButton,
              {
                backgroundColor: selectedSound?.name === item.name 
                  ? theme.colors.primary + '40'
                  : theme.dark ? theme.colors.surface : '#e0e0e0'
              }
            ]}
            onPress={() => selectDefaultSound(item.file, item.name)}
          >
            <Text style={{ color: theme.colors.text }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Button
        mode="contained"
        onPress={saveReminder}
        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        disabled={!title || (!audioUri && !selectedSound)}
      >
        Save Reminder
      </Button>

      <Portal>
        <Modal
          visible={showPicker}
          onDismiss={() => setShowPicker(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {showPicker && (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              display="default"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) {
                  const updatedDate = new Date(date);
                  if (pickerMode === 'date') {
                    updatedDate.setFullYear(selectedDate.getFullYear());
                    updatedDate.setMonth(selectedDate.getMonth());
                    updatedDate.setDate(selectedDate.getDate());
                  } else if (pickerMode === 'time') {
                    updatedDate.setHours(selectedDate.getHours());
                    updatedDate.setMinutes(selectedDate.getMinutes());
                    updatedDate.setSeconds(0);
                  }
                  setDate(updatedDate);
                }
              }}
              style={{ backgroundColor: theme.colors.surface }}
            />
          )}
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
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  dateButton: {
    marginBottom: 16,
    borderRadius: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  recordingContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  recordButton: {
    width: 200,
    borderRadius: 50,
    marginVertical: 16,
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  soundButton: {
    padding: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
});

export default RecordScreen; 