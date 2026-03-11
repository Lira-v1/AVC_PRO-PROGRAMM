import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROOM_VIEW_MODE_LABELS, ROOM_VIEW_MODES, RoomViewMode } from '../model/roomViewMode';

type RoomModeSwitchProps = {
  mode: RoomViewMode;
  onChange: (mode: RoomViewMode) => void;
};

export const RoomModeSwitch = ({ mode, onChange }: RoomModeSwitchProps) => (
  <View style={styles.root}>
    {ROOM_VIEW_MODES.map((roomMode) => {
      const isActive = mode === roomMode;
      return (
        <Pressable key={roomMode} style={[styles.button, isActive ? styles.buttonActive : null]} onPress={() => onChange(roomMode)}>
          <Text style={[styles.text, isActive ? styles.textActive : null]}>{ROOM_VIEW_MODE_LABELS[roomMode]}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  root: { flexDirection: 'row', backgroundColor: '#E8EEF8', borderRadius: 10, padding: 4, gap: 4, marginBottom: 8 },
  button: { flex: 1, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  buttonActive: { backgroundColor: '#FFFFFF' },
  text: { color: '#4B5F8D', fontSize: 13, fontWeight: '700' },
  textActive: { color: '#2449A7' },
});
