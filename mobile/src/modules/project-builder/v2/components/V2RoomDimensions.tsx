import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { worldToSceneRect } from '../utils/sceneCoordinates';
import { getRoomVisualBounds } from '../utils/getRoomVisualBounds';
import { formatDimensionByUnit, RoomSizeUnit } from '../utils/roomUnits';

type Props = {
  room: RoomV2;
  unit: RoomSizeUnit;
};

const DIMENSION_STROKE = '#334155';
const DIMENSION_OFFSET = 26;
const DIMENSION_TEXT_OFFSET = 18;

export const V2RoomDimensions = ({ room, unit }: Props) => {
  const normalizedRotation = ((room.rotation ?? 0) % 360 + 360) % 360;
  const isVerticalOrientation = normalizedRotation === 90 || normalizedRotation === 270;

  const widthValue = room.widthMm;
  const heightValue = room.heightMm;

  const topValue = isVerticalOrientation ? heightValue : widthValue;
  const leftValue = isVerticalOrientation ? widthValue : heightValue;
  const topLabel = formatDimensionByUnit(topValue, unit).replace(' ', '\u00A0');
  const leftLabel = formatDimensionByUnit(leftValue, unit).replace(' ', '\u00A0');

  const bounds = worldToSceneRect(getRoomVisualBounds(room));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.topDimensionLine,
          {
            left: bounds.x,
            top: bounds.y - DIMENSION_OFFSET,
            width: bounds.width,
          },
        ]}
      >
        <View style={styles.topEndCapLeft} />
        <View style={styles.topEndCapRight} />
        <Text style={styles.topDimensionText}>{topLabel}</Text>
      </View>

      <View
        style={[
          styles.leftDimensionLine,
          {
            left: bounds.x - DIMENSION_OFFSET,
            top: bounds.y,
            height: bounds.height,
          },
        ]}
      >
        <View style={styles.leftEndCapTop} />
        <View style={styles.leftEndCapBottom} />
        <View style={styles.leftDimensionTextWrapper}>
          <Text numberOfLines={1} style={styles.leftDimensionText}>
            {leftLabel}
          </Text>
        </View>
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
    top: -DIMENSION_TEXT_OFFSET,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    color: '#0F172A',
  },
  leftDimensionLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: DIMENSION_STROKE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
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
  leftDimensionTextWrapper: {
    position: 'absolute',
    left: -(DIMENSION_TEXT_OFFSET + 18),
    top: '50%',
    width: 104,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -7 }, { rotate: '-90deg' }],
  },
  leftDimensionText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
  },
});
