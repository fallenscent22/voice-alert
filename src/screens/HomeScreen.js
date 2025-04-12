import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [reminders, setReminders] = useState([]);
  const isFocused = useIsFocused();
  const theme = useTheme();

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
});

export default HomeScreen; 