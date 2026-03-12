import React from 'react';
import { StyleSheet, View } from 'react-native';

const GRID_COUNT = 24;
const GRID_LINES = Array.from({ length: GRID_COUNT }, (_, index) => index + 1);

export const V2Grid = () => {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {GRID_LINES.map((line) => (
        <View
          key={`h-${line}`}
          style={[
            styles.horizontal,
            line % 4 === 0 ? styles.majorLine : null,
            { top: `${(line * 100) / (GRID_COUNT + 1)}%` },
          ]}
        />
      ))}
      {GRID_LINES.map((line) => (
        <View
          key={`v-${line}`}
          style={[
            styles.vertical,
            line % 4 === 0 ? styles.majorLine : null,
            { left: `${(line * 100) / (GRID_COUNT + 1)}%` },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  horizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  vertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  majorLine: {
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
});
