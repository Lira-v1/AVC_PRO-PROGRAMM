import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { getElementsByWall } from '../model/wallView';
import { ElementNode, Wall } from '../types';
import { ElementSymbol } from './ElementSymbol';
import { WallViewHeader } from './WallViewHeader';

const TRACK_PADDING = 20;
const WALL_LINE_HEIGHT = 120;

type WallViewProps = {
  roomName: string;
  roomId: string;
  wall: Wall;
  elements: ElementNode[];
  selectedElementId: string | null;
  onSelectElement: (elementId: string) => void;
  onMoveElement: (elementId: string, x: number, y: number) => void;
};

export const WallView = ({ roomName, roomId, wall, elements, selectedElementId, onSelectElement, onMoveElement }: WallViewProps) => {
  const [trackWidth, setTrackWidth] = useState(280);
  const wallElements = useMemo(() => getElementsByWall(elements, roomId, wall.id), [elements, roomId, wall.id]);
  const wallLength = wall.length ?? Math.max(1, Math.abs(wall.x2 - wall.x1) + Math.abs(wall.y2 - wall.y1));

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.root}>
      <WallViewHeader roomName={roomName} wall={wall} />
      <View style={styles.wallArea} onLayout={handleLayout}>
        <View style={styles.wallLine} />
        {wallElements.map((element) => {
          const ratio = wall.side === 'top' || wall.side === 'bottom' ? (element.x - wall.x1) / wallLength : (element.y - wall.y1) / wallLength;
          const left = TRACK_PADDING + Math.max(0, Math.min(1, ratio)) * Math.max(1, trackWidth - TRACK_PADDING * 2);

          const responder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
              const usableWidth = Math.max(1, trackWidth - TRACK_PADDING * 2);
              const localX = Math.max(0, Math.min(usableWidth, left + gestureState.dx - TRACK_PADDING));
              const nextRatio = localX / usableWidth;

              if (wall.side === 'top' || wall.side === 'bottom') {
                onMoveElement(element.id, wall.x1 + nextRatio * wallLength, wall.y1);
                return;
              }

              onMoveElement(element.id, wall.x1, wall.y1 + nextRatio * wallLength);
            },
          });

          return (
            <Pressable
              key={element.id}
              onPress={() => onSelectElement(element.id)}
              style={[styles.node, { left: left - 16 }, selectedElementId === element.id ? styles.nodeSelected : null]}
              {...responder.panHandlers}
            >
              <ElementSymbol type={element.type} selected={selectedElementId === element.id} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.tip}>Перетяните элемент вдоль стены для изменения позиции.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D7DEEE', padding: 12 },
  wallArea: { height: WALL_LINE_HEIGHT, justifyContent: 'center', position: 'relative' },
  wallLine: { height: 4, borderRadius: 2, backgroundColor: '#304A87', marginHorizontal: TRACK_PADDING },
  node: { position: 'absolute', top: WALL_LINE_HEIGHT / 2 - 18, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  nodeSelected: { backgroundColor: '#E8EEFF' },
  tip: { marginTop: 8, fontSize: 12, color: '#607196' },
});
