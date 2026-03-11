import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ElementType } from '../types';

type ElementSymbolProps = {
  type: ElementType;
  selected?: boolean;
  rotation?: number;
};

const STROKE = '#1C2A44';
const ACCENT = '#2D5ED2';

export const ElementSymbol = ({ type, selected = false, rotation = 0 }: ElementSymbolProps) => {
  const color = selected ? ACCENT : STROKE;

  return (
    <View style={[styles.root, { transform: [{ rotate: `${rotation}deg` }] }]}>
      {type === 'socket' ? <View style={[styles.socket, { borderColor: color }]} /> : null}
      {type === 'double_socket' ? (
        <View style={styles.doubleRow}>
          <View style={[styles.socket, { borderColor: color }]} />
          <View style={[styles.socket, { borderColor: color }]} />
        </View>
      ) : null}
      {type === 'switch' ? <View style={[styles.switch, { borderColor: color }]} /> : null}
      {type === 'double_switch' ? (
        <View style={styles.doubleRow}>
          <View style={[styles.switch, { borderColor: color }]} />
          <View style={[styles.switch, { borderColor: color }]} />
        </View>
      ) : null}
      {type === 'light_point' ? (
        <View style={[styles.lightPoint, { borderColor: color }]}>
          <View style={[styles.crossLine, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.crossLine, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
        </View>
      ) : null}
      {type === 'junction_box' ? <View style={[styles.junction, { borderColor: color }]} /> : null}
      {type === 'panel' ? <View style={[styles.panel, { borderColor: color }]} /> : null}
      {type === 'door' ? (
        <View style={styles.doorWrap}>
          <View style={[styles.doorLeaf, { backgroundColor: color }]} />
          <View style={[styles.doorArc, { borderColor: color }]} />
        </View>
      ) : null}
      {type === 'window' ? (
        <View style={styles.windowWrap}>
          <View style={[styles.windowLine, { backgroundColor: color }]} />
          <View style={[styles.windowLine, { backgroundColor: color }]} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  socket: { width: 10, height: 10, borderWidth: 1.5, borderRadius: 2 },
  switch: { width: 12, height: 6, borderWidth: 1.5, transform: [{ skewX: '-25deg' }] },
  doubleRow: { flexDirection: 'row', gap: 3 },
  lightPoint: { width: 16, height: 16, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  crossLine: { position: 'absolute', width: 12, height: 1.2 },
  junction: { width: 12, height: 12, borderWidth: 1.5, borderRadius: 6, backgroundColor: '#FFFFFF' },
  panel: { width: 10, height: 16, borderWidth: 1.5, borderRadius: 1 },
  doorWrap: { width: 20, height: 20, alignItems: 'flex-start', justifyContent: 'flex-end' },
  doorLeaf: { width: 12, height: 1.5, borderWidth: 0, backgroundColor: STROKE },
  doorArc: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: STROKE,
    borderTopRightRadius: 18,
    right: 1,
    bottom: 1,
  },
  windowWrap: { width: 18, gap: 4 },
  windowLine: { width: 18, height: 1.5 },
});
