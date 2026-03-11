import React, { useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { ElementNode } from '../types';
import { ElementSymbol } from './ElementSymbol';

type CanvasLayerElementsProps = {
  elements: ElementNode[];
  selectedElementId: string | null;
  canDrag: boolean;
  onSelectElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onMoveElement: (elementId: string, x: number, y: number) => void;
};

const HIT_SIZE = 36;

export const CanvasLayerElements = ({
  elements,
  selectedElementId,
  canDrag,
  onSelectElement,
  onDeleteElement,
  onMoveElement,
}: CanvasLayerElementsProps) => {
  return (
    <>
      {elements.map((element) => (
        <DraggableElement
          key={element.id}
          element={element}
          isSelected={selectedElementId === element.id}
          canDrag={canDrag}
          onSelectElement={onSelectElement}
          onDeleteElement={onDeleteElement}
          onMoveElement={onMoveElement}
        />
      ))}
    </>
  );
};

type DraggableElementProps = {
  element: ElementNode;
  isSelected: boolean;
  canDrag: boolean;
  onSelectElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onMoveElement: (elementId: string, x: number, y: number) => void;
};

const DraggableElement = ({
  element,
  isSelected,
  canDrag,
  onSelectElement,
  onDeleteElement,
  onMoveElement,
}: DraggableElementProps) => {
  const dragOriginRef = useRef({ x: element.x, y: element.y });

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canDrag,
        onMoveShouldSetPanResponder: () => canDrag,
        onPanResponderGrant: () => {
          dragOriginRef.current = { x: element.x, y: element.y };
          onSelectElement(element.id);
        },
        onPanResponderMove: (_, gestureState) => {
          onMoveElement(element.id, dragOriginRef.current.x + gestureState.dx, dragOriginRef.current.y + gestureState.dy);
        },
      }),
    [canDrag, element.id, element.x, element.y, onMoveElement, onSelectElement],
  );

  return (
    <Pressable
      {...dragResponder.panHandlers}
      style={[styles.hitArea, { left: element.x - HIT_SIZE / 2, top: element.y - HIT_SIZE / 2 }, isSelected ? styles.activeHit : null]}
      onPress={() => (canDrag ? onSelectElement(element.id) : onDeleteElement(element.id))}
    >
      <View pointerEvents="none">
        <ElementSymbol type={element.type} widthMm={element.widthMm} selected={isSelected} rotation={element.rotation} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    width: HIT_SIZE,
    height: HIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  activeHit: {
    backgroundColor: '#E3ECFF',
  },
});
