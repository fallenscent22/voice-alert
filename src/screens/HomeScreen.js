import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import { useIsFocused } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [reminders, setReminders] = useState([]);
  const isFocused = useIsFocused();


  useEffect(() => {
    if (isFocused) {
      loadReminders(); // fetch updated list whenever screen is focused
    }
  }, [isFocused]);

  const loadReminders = async () => {
    try {
      const loadedReminders = await StorageService.getReminders();
      setReminders(loadedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const renderReminder = ({ item }) => (
    <Card style={styles.reminderCard} onPress={() => navigation.navigate('Record', { reminder: item })}>
      <Card.Content>
        <Text variant="titleMedium">{item.title}</Text>
        <Text variant="bodyMedium">
          {new Date(item.date).toLocaleString()}
        </Text>
        {item.isRecurring && (
          <Text variant="bodySmall" style={styles.recurringText}>
            Recurring
          </Text>
        )}
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
  recurringText: {
    color: '#6200ee',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default HomeScreen; 