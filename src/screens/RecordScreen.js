import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, Switch, Portal, Modal } from 'react-native-paper';
import { Audio } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';

const RecordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [audioUri, setAudioUri] = useState(null);

  useEffect(() => {
    if (route.params?.reminder) {
      const { reminder } = route.params;
      setTitle(reminder.title);
      setDate(new Date(reminder.date));
      setIsRecurring(reminder.isRecurring);
      setAudioUri(reminder.audioUri);
    }
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      await recording.startAsync();
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
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
    } catch (err) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const saveReminder = async () => {
    if (!audioUri || !title) {
      Alert.alert('Error', 'Please record audio and add a title');
      return;
    }

    try {
      const reminder = {
        id: route.params?.reminder?.id || Date.now().toString(),
        title,
        date,
        audioUri,
        isRecurring,
      };

      await StorageService.saveReminder(reminder);
      await NotificationService.scheduleNotification(reminder);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save reminder');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Reminder Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <Button
        mode="outlined"
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
      >
        {date.toLocaleString()}
      </Button>

      <View style={styles.switchContainer}>
        <Text>Recurring Reminder</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          color="#6200ee"
        />
      </View>

      <View style={styles.recordingContainer}>
        <Button
          mode="contained"
          onPress={isRecording ? stopRecording : startRecording}
          style={styles.recordButton}
          icon={isRecording ? 'stop' : 'microphone'}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </View>

      <Button
        mode="contained"
        onPress={saveReminder}
        style={styles.saveButton}
        disabled={!audioUri || !title}
      >
        Save Reminder
      </Button>

      <Portal>
        <Modal
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          contentContainerStyle={styles.modal}
        >
          <DateTimePicker
            value={date}
            mode="datetime"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f6f6f6',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  dateButton: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 16,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
});

export default RecordScreen; 