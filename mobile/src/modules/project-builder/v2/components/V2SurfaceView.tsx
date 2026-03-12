import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoomSurface } from '../model/editorTypes';
import { RoomV2 } from '../model/types';
import {
  formatMm,
  getSurfaceHeightMm,
  getSurfaceTitle,
  getSurfaceWidthMm,
} from '../utils/getSurfaceMetrics';

type Props = {
  room: RoomV2;
  surface: RoomSurface;
};

export const V2SurfaceView = ({ room, surface }: Props) => {
  const widthMm = getSurfaceWidthMm(room, surface);
  const heightMm = getSurfaceHeightMm(room, surface);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{getSurfaceTitle(surface)}</Text>
        <Text style={styles.meta}>
          {formatMm(widthMm)} × {formatMm(heightMm)}
        </Text>
      </View>

      <View style={styles.surfacePlane}>
        <Text style={styles.surfaceLabel}>{getSurfaceTitle(surface)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
  },
  surfacePlane: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfaceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
});
