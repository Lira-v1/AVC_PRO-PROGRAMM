import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CompassOrientation } from '../model/types';

type Props = {
  orientation: CompassOrientation;
  onToggleOrientation: () => void;
};

export const V2Compass = ({ orientation, onToggleOrientation }: Props) => {
  const labels =
    orientation === 'default'
      ? { top: 'N', bottom: 'S', left: 'W', right: 'E' }
      : { top: 'S', bottom: 'N', left: 'E', right: 'W' };

  return (
    <Pressable onPress={onToggleOrientation} style={styles.root}>
      <Text style={[styles.label, styles.north]}>{labels.top}</Text>
      <Text style={[styles.label, styles.south]}>{labels.bottom}</Text>
      <Text style={[styles.label, styles.west]}>{labels.left}</Text>
      <Text style={[styles.label, styles.east]}>{labels.right}</Text>
      <View style={styles.crossVertical} />
      <View style={styles.crossHorizontal} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#DCE3F2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  label: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  north: { top: 4 },
  south: { bottom: 4 },
  west: { left: 6 },
  east: { right: 6 },
  crossVertical: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    width: 1,
    backgroundColor: '#94A3B8',
  },
  crossHorizontal: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: '#94A3B8',
  },
});
