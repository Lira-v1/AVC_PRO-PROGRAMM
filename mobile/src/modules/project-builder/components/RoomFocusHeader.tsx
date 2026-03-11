import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type RoomFocusHeaderProps = {
  roomName: string;
  onBack: () => void;
  breadcrumb?: string;
};

export const RoomFocusHeader = ({ roomName, onBack, breadcrumb }: RoomFocusHeaderProps) => (
  <View style={styles.container}>
    {breadcrumb ? <Text style={styles.breadcrumb}>{breadcrumb}</Text> : null}
    <View style={styles.root}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>Назад к плану</Text>
      </Pressable>
      <Text style={styles.title}>Комната: {roomName}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  breadcrumb: {
    marginBottom: 6,
    color: '#6A7B9F',
    fontSize: 12,
    fontWeight: '600',
  },
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
