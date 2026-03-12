import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';

type Props = {
  room: RoomV2;
};

const DIMENSION_STROKE = '#334155';
const DIMENSION_OFFSET = 26;

const formatMeters = (valueCm: number) => `${(valueCm / 100).toFixed(2)} м`;

export const V2RoomDimensions = ({ room }: Props) => {
  const widthValue = room.widthCm ?? room.width;
  const heightValue = room.heightCm ?? room.height;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.topDimensionLine,
          {
            left: room.x,
            top: room.y - DIMENSION_OFFSET,
            width: room.width,
          },
        ]}
      >
        <View style={styles.topEndCapLeft} />
        <View style={styles.topEndCapRight} />
        <Text style={styles.topDimensionText}>{formatMeters(widthValue)}</Text>
      </View>

      <View
        style={[
          styles.leftDimensionLine,
          {
            left: room.x - DIMENSION_OFFSET,
            top: room.y,
            height: room.height,
          },
        ]}
      >
        <View style={styles.leftEndCapTop} />
        <View style={styles.leftEndCapBottom} />
        <Text style={styles.leftDimensionText}>{formatMeters(heightValue)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topDimensionLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: DIMENSION_STROKE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topEndCapLeft: {
    position: 'absolute',
    left: 0,
    top: -4,
    width: 1,
    height: 8,
    backgroundColor: DIMENSION_STROKE,
  },
  topEndCapRight: {
    position: 'absolute',
    right: 0,
    top: -4,
    width: 1,
    height: 8,
    backgroundColor: DIMENSION_STROKE,
  },
  topDimensionText: {
    position: 'absolute',
    top: -18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  leftDimensionLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: DIMENSION_STROKE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftEndCapTop: {
    position: 'absolute',
    top: 0,
    left: -4,
    width: 8,
    height: 1,
    backgroundColor: DIMENSION_STROKE,
  },
  leftEndCapBottom: {
    position: 'absolute',
    bottom: 0,
    left: -4,
    width: 8,
    height: 1,
    backgroundColor: DIMENSION_STROKE,
  },
  leftDimensionText: {
    position: 'absolute',
    left: -18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    transform: [{ rotate: '-90deg' }],
  },
});
