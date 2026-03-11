import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type RoomFocusHeaderProps = {
  roomName: string;
  onBack: () => void;
};

export const RoomFocusHeader = ({ roomName, onBack }: RoomFocusHeaderProps) => (
  <View style={styles.root}>
    <Pressable style={styles.backButton} onPress={onBack}>
      <Text style={styles.backText}>Назад к плану</Text>
    </Pressable>
    <Text style={styles.title}>Комната: {roomName}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBC5DC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  backText: {
    color: '#2A3756',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#1E2A46',
    fontSize: 14,
    fontWeight: '700',
  },
});
