import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  isFullscreen: boolean;
  showGrid: boolean;
  scale: number;
  onToggleFullscreen: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
};

export const V2CanvasControls = ({
  isFullscreen,
  showGrid,
  scale,
  onToggleFullscreen,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: Props) => {
  return (
    <View style={styles.root}>
      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={onZoomOut}>
          <Text style={styles.buttonText}>−</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={onZoomIn}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={onResetZoom}>
          <Text style={styles.buttonText}>100%</Text>
        </Pressable>

        <View style={styles.scaleChip}>
          <Text style={styles.scaleChipText}>{Math.round(scale * 100)}%</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={onToggleFullscreen}>
          <Text style={styles.buttonText}>{isFullscreen ? 'Свернуть' : 'Полный экран'}</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={onToggleGrid}>
          <Text style={styles.buttonText}>{showGrid ? 'Скрыть сетку' : 'Показать сетку'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 12,
    left: 12,
    gap: 8,
    zIndex: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
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
  scaleChip: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  scaleChipText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
});
