import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { CANVAS_UNITS_PER_METER, GRID_CELLS_PER_METER } from '../model/metrics';

type Props = {
  sceneWidth: number;
  sceneHeight: number;
};

export const V2Grid = ({ sceneWidth, sceneHeight }: Props) => {
  const meterSizePx = CANVAS_UNITS_PER_METER;
  const cellSizePx = meterSizePx / GRID_CELLS_PER_METER;

  const verticalLines = useMemo(() => {
    const lineCount = Math.ceil(sceneWidth / cellSizePx) + 1;

    return Array.from({ length: lineCount }, (_, index) => {
      const x = index * cellSizePx;

      return {
        key: `v-${index}`,
        x,
        isMajor: index % GRID_CELLS_PER_METER === 0,
      };
    });
  }, [cellSizePx, sceneWidth]);

  const horizontalLines = useMemo(() => {
    const lineCount = Math.ceil(sceneHeight / cellSizePx) + 1;

    return Array.from({ length: lineCount }, (_, index) => {
      const y = index * cellSizePx;

      return {
        key: `h-${index}`,
        y,
        isMajor: index % GRID_CELLS_PER_METER === 0,
      };
    });
  }, [cellSizePx, sceneHeight]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {horizontalLines.map((line) => (
        <View
          key={line.key}
          style={[styles.horizontal, line.isMajor ? styles.majorLine : null, { top: line.y }]}
        />
      ))}
      {verticalLines.map((line) => (
        <View key={line.key} style={[styles.vertical, line.isMajor ? styles.majorLine : null, { left: line.x }]} />
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
