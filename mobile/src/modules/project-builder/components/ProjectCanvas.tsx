import React from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { ElementNode, Room, ToolType } from '../types';
import { CanvasLayerElements } from './CanvasLayerElements';
import { RoomRectangle } from './RoomRectangle';

type ProjectCanvasProps = {
  rooms: Room[];
  elements: ElementNode[];
  selectedRoomId: string | null;
  selectedElementId: string | null;
  tool: ToolType;
  onSelectRoom: (roomId: string) => void;
  onOpenRoom?: (roomId: string) => void;
  onMoveRoom: (roomId: string, x: number, y: number) => void;
  onResizeRoom: (roomId: string, width: number, height: number) => void;
  onCanvasTap: (point: { x: number; y: number }) => void;
  onSelectElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onMoveElement: (elementId: string, x: number, y: number) => void;
};

export const ProjectCanvas = ({
  rooms,
  elements,
  selectedRoomId,
  selectedElementId,
  tool,
  onSelectRoom,
  onOpenRoom,
  onMoveRoom,
  onResizeRoom,
  onCanvasTap,
  onSelectElement,
  onDeleteElement,
  onMoveElement,
}: ProjectCanvasProps) => {
  const handleTap = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    onCanvasTap({ x: locationX, y: locationY });
  };

  const selectMode = tool === 'select';

  return (
    <Pressable style={styles.canvas} onPress={handleTap}>
      {rooms.length === 0 ? <Text style={styles.hint}>Добавьте комнату, чтобы начать проект</Text> : null}
      {rooms.map((room) => (
        <RoomRectangle
          key={room.id}
          room={room}
          isSelected={selectedRoomId === room.id}
          canInteract={selectMode}
          onSelect={onSelectRoom}
          onDoublePress={onOpenRoom}
          onMove={onMoveRoom}
          onResize={onResizeRoom}
        />
      ))}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <CanvasLayerElements
          elements={elements}
          selectedElementId={selectedElementId}
          canDrag={selectMode}
          onSelectElement={onSelectElement}
          onDeleteElement={onDeleteElement}
          onMoveElement={onMoveElement}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 360,
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: '#8190B2',
    fontSize: 14,
  },
});
