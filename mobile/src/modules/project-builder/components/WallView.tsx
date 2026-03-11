import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getElementsByWall } from '../model/wallView';
import { getElementWidthMm, getWallLength } from '../model/wallGeometry';
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
  const [manualOffsetMm, setManualOffsetMm] = useState('');
  const wallElements = useMemo(() => getElementsByWall(elements, roomId, wall.id), [elements, roomId, wall.id]);
  const wallLength = getWallLength(wall);
  const selectedElement = wallElements.find((element) => element.id === selectedElementId) ?? null;

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.root}>
      <WallViewHeader roomName={roomName} wall={wall} />
      <View style={styles.wallArea} onLayout={handleLayout}>
        <View style={styles.wallLine} />
        {wallElements.map((element) => {
          const offsetMm = element.offsetMm ?? 0;
          const ratio = offsetMm / Math.max(1, wallLength);
          const left = TRACK_PADDING + Math.max(0, Math.min(1, ratio)) * Math.max(1, trackWidth - TRACK_PADDING * 2);
          const symbolWidth = Math.max(28, Math.min(74, getElementWidthMm(element) * 0.06));

          const responder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
              onSelectElement(element.id);
            },
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
              style={[styles.node, { left: left - symbolWidth / 2, width: symbolWidth, height: symbolWidth, borderRadius: symbolWidth / 2 }, selectedElementId === element.id ? styles.nodeSelected : null]}
              {...responder.panHandlers}
            >
              <ElementSymbol type={element.type} widthMm={element.widthMm} selected={selectedElementId === element.id} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.tip}>Перетяните элемент вдоль стены или введите offset вручную.</Text>
      {selectedElement ? (
        <View style={styles.inlineEditor}>
          <Text style={styles.editorLabel}>Offset (мм)</Text>
          <TextInput
            style={styles.editorInput}
            keyboardType="numeric"
            value={manualOffsetMm || String(Math.round(selectedElement.offsetMm ?? 0))}
            onChangeText={setManualOffsetMm}
            placeholder="Например, 1200"
          />
          <Pressable
            style={styles.applyButton}
            onPress={() => {
              const parsed = Number(manualOffsetMm.replace(',', '.'));
              if (!Number.isFinite(parsed)) return;
              if (wall.side === 'top' || wall.side === 'bottom') {
                onMoveElement(selectedElement.id, wall.x1 + parsed, wall.y1);
              } else {
                onMoveElement(selectedElement.id, wall.x1, wall.y1 + parsed);
              }
              setManualOffsetMm('');
            }}
          >
            <Text style={styles.applyText}>Применить</Text>
          </Pressable>
        </View>
      ) : null}
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
  inlineEditor: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  editorLabel: { fontSize: 12, color: '#425784', fontWeight: '600' },
  editorInput: { flex: 1, borderWidth: 1, borderColor: '#BBC5DC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  applyButton: { backgroundColor: '#2D5ED2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  applyText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
