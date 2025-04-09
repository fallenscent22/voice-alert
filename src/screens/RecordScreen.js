import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { Text, Button, TextInput, Switch, Portal, Modal, useTheme} from 'react-native-paper';
import { Audio } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';

const defaultSounds=[
  {name: 'Anime Wow', file: require('../../assets/sounds/Animewow.mp3')},
  {name: 'Bird', file: require('../../assets/sounds/Bird.mp3')},
  {name: 'Birds Chirping', file: require('../../assets/sounds/BirdsChirping.mp3')},
  {name: 'Die With A Smile', file: require('../../assets/sounds/DieWithASmile.mp3')},
  {name: 'Gun Shot', file: require('../../assets/sounds/GunShot.mp3')},
  {name: 'iphone 16 Pro Max', file: require('../../assets/sounds/Iphone16ProMaxRingtone .mp3')},
  {name: 'Money Heist', file: require('../../assets/sounds/IphoneMoneyHeistRingtone.mp3')},
  {name: 'JARVIS Alarm', file: require('../../assets/sounds/jarvisalarm.mp3')},
  {name: 'Minions Wakeup', file: require('../../assets/sounds/minionswakeup.mp3')},
  {name: 'Retro Game Alarm', file: require('../../assets/sounds/mixkitretrogameemergencyalarm.wav')},
  {name: 'One Love', file: require('../../assets/sounds/OneLove.mp3')},
  {name: 'Simple Notification', file: require('../../assets/sounds/simplenotification.mp3')},
  {name: 'Vine Boom', file: require('../../assets/sounds/vineboom.mp3')}
];

const RecordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const scheme = useColorScheme();
  const theme = useTheme();

  
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [showDatePicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('datetime');

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
    if (!title || !date || !audioUri) {
      Alert.alert('Error', 'Please fill in all required fields');
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
      const notificationId = await NotificationService.scheduleNotification(reminder);
      reminder.notificationId = notificationId;
      await StorageService.saveReminder(reminder);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save reminder');
    }
  };

  const selectDefaultSound = async (soundFile) => {
    const { sound, status } = await Audio.Sound.createAsync(soundFile);
    await sound.playAsync();
    setAudioUri(soundFile); // Store file reference
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          color={theme.colors.primary}
        />
      </View>

      <View style={styles.recordingContainer}>
        <Button
          mode="contained"
          onPress={isRecording ? stopRecording : startRecording}
          icon={isRecording ? 'stop' : 'microphone'}
          style={styles.recordButton}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </View>

      <Text style={{ marginVertical: 12 }}>Or choose a default sound:</Text>
      <FlatList
        data={defaultSounds}
        keyExtractor={(item) => item.name}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.soundButton}
            onPress={() => selectDefaultSound(item.file)}
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

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
          {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
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
    //backgroundColor: '#f6f6f6',
  },
  input: {
    marginBottom: 16,
    //backgroundColor: 'white',
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
    //flex: 1,
    //justifyContent: 'center',
    marginBottom: 16,
    alignItems: 'center',
  },
  recordButton: {
    width: 200,
    //height: 200,
    borderRadius: 50,
    //justifyContent: 'center',
  },
  saveButton: {
    marginTop: 16,
  },
  soundButton: {
    padding: 10,
    marginHorizontal: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
});

export default RecordScreen; 