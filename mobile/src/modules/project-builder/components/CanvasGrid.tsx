import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

type CanvasGridProps = {
  step?: number;
};

const DEFAULT_STEP = 24;

export const CanvasGrid = ({ step = DEFAULT_STEP }: CanvasGridProps) => {
  const verticalLines = useMemo(() => Array.from({ length: Math.ceil(720 / step) }), [step]);
  const horizontalLines = useMemo(() => Array.from({ length: Math.ceil(720 / step) }), [step]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {verticalLines.map((_, index) => (
        <View key={`v-${index}`} style={[styles.verticalLine, { left: index * step }]} />
      ))}
      {horizontalLines.map((_, index) => (
        <View key={`h-${index}`} style={[styles.horizontalLine, { top: index * step }]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(65, 102, 181, 0.08)',
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(65, 102, 181, 0.08)',
  },
});
