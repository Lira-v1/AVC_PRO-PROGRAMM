import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type RoomViewMode = 'plan' | 'walls';

type RoomModeSwitchProps = {
  mode: RoomViewMode;
  onChange: (mode: RoomViewMode) => void;
};

export const RoomModeSwitch = ({ mode, onChange }: RoomModeSwitchProps) => (
  <View style={styles.root}>
    <Pressable style={[styles.button, mode === 'plan' ? styles.buttonActive : null]} onPress={() => onChange('plan')}>
      <Text style={[styles.text, mode === 'plan' ? styles.textActive : null]}>План</Text>
    </Pressable>
    <Pressable style={[styles.button, mode === 'walls' ? styles.buttonActive : null]} onPress={() => onChange('walls')}>
      <Text style={[styles.text, mode === 'walls' ? styles.textActive : null]}>Стены</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  root: { flexDirection: 'row', backgroundColor: '#E8EEF8', borderRadius: 10, padding: 4, gap: 4, marginBottom: 8 },
  button: { flex: 1, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  buttonActive: { backgroundColor: '#FFFFFF' },
  text: { color: '#4B5F8D', fontSize: 13, fontWeight: '700' },
  textActive: { color: '#2449A7' },
});
