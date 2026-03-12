import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  isFullscreen: boolean;
  showGrid: boolean;
  onToggleFullscreen: () => void;
  onToggleGrid: () => void;
};

export const V2CanvasControls = ({ isFullscreen, showGrid, onToggleFullscreen, onToggleGrid }: Props) => {
  return (
    <View style={styles.root}>
      <Pressable style={styles.button} onPress={onToggleFullscreen}>
        <Text style={styles.buttonText}>{isFullscreen ? 'Свернуть' : 'Полный экран'}</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={onToggleGrid}>
        <Text style={styles.buttonText}>{showGrid ? 'Скрыть сетку' : 'Показать сетку'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
  },
});
