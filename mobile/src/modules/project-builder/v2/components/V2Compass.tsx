import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const V2Compass = () => {
  return (
    <View pointerEvents="none" style={styles.root}>
      <Text style={[styles.label, styles.north]}>С</Text>
      <Text style={[styles.label, styles.south]}>Ю</Text>
      <Text style={[styles.label, styles.west]}>З</Text>
      <Text style={[styles.label, styles.east]}>В</Text>
      <View style={styles.crossVertical} />
      <View style={styles.crossHorizontal} />
    </View>
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
