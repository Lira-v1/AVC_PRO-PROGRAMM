import React, { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { CanvasEngine } from '../../engineering/canvasV3/CanvasEngine';
import { CanvasSnapshot } from '../../engineering/canvasV3/CanvasTypes';

const createEngine = () => new CanvasEngine(1000, 1000);

export const CanvasV3DevScreen = () => {
  const engineRef = useRef<CanvasEngine>(createEngine());
  const [snapshot, setSnapshot] = useState<CanvasSnapshot>(engineRef.current.getSnapshot());
  const dragRef = useRef({ x: 0, y: 0 });

  const refreshSnapshot = () => {
    setSnapshot(engineRef.current.getSnapshot());
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    engineRef.current.setViewport({ width, height });
    refreshSnapshot();
  };

  const onCanvasPress = (event: GestureResponderEvent) => {
    const world = engineRef.current.screenToWorld({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
    const snapped = engineRef.current.snapToGrid(world);
    console.log('[CanvasV3Dev] world:', world, 'snapped:', snapped);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragRef.current = { x: 0, y: 0 };
        },
        onPanResponderMove: (_, gestureState) => {
          const deltaX = gestureState.dx - dragRef.current.x;
          const deltaY = gestureState.dy - dragRef.current.y;
          dragRef.current = { x: gestureState.dx, y: gestureState.dy };

          engineRef.current.panBy(deltaX, deltaY);
          refreshSnapshot();
        },
      }),
    [],
  );

  const centerWorld = engineRef.current.screenToWorld({
    x: snapshot.canvasState.viewport.width / 2,
    y: snapshot.canvasState.viewport.height / 2,
  });

  return (
    <View style={styles.root}>
      <AppHeader title="Canvas V3 Dev" />
      <View style={styles.metaPanel}>
        <Text style={styles.metaText}>zoom: {snapshot.camera.zoom.toFixed(2)}</Text>
        <Text style={styles.metaText}>pan: ({snapshot.camera.panX.toFixed(1)}, {snapshot.camera.panY.toFixed(1)})</Text>
        <Text style={styles.metaText}>center world: ({centerWorld.x.toFixed(1)}, {centerWorld.y.toFixed(1)})</Text>
      </View>

      <View style={styles.zoomControls}>
        <Pressable
          style={styles.zoomButton}
          onPress={() => {
            engineRef.current.zoomBy(0.8);
            refreshSnapshot();
          }}
        >
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
        <Pressable
          style={styles.zoomButton}
          onPress={() => {
            engineRef.current.zoomBy(1.25);
            refreshSnapshot();
          }}
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </Pressable>
      </View>

      <Pressable style={styles.canvasArea} onLayout={onLayout} onPress={onCanvasPress}>
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          {snapshot.grid.lines.map((line) => (
            <View
              key={line.id}
              style={[
                styles.gridLine,
                line.axis === 'y'
                  ? {
                      left: line.from.x,
                      top: Math.min(line.from.y, line.to.y),
                      height: Math.abs(line.to.y - line.from.y),
                      width: 1,
                    }
                  : {
                      top: line.from.y,
                      left: Math.min(line.from.x, line.to.x),
                      width: Math.abs(line.to.x - line.from.x),
                      height: 1,
                    },
              ]}
            />
          ))}
          <View style={styles.centerMarker} />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  metaPanel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EEF7',
    gap: 4,
  },
  metaText: {
    color: '#24324A',
    fontSize: 13,
  },
  zoomControls: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  zoomButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2D5BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  canvasArea: {
    flex: 1,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2F4',
    overflow: 'hidden',
    backgroundColor: '#F9FBFF',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#D3DFF5',
  },
  centerMarker: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2D5BFF',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -5 }, { translateY: -5 }],
  },
});
