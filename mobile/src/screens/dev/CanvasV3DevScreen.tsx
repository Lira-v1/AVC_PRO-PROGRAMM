import React, { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { CanvasEngine } from '../../engineering/canvasV3/CanvasEngine';
import { CanvasDebugState, CanvasSnapshot, RoomModel, ScreenPoint } from '../../engineering/canvasV3/CanvasTypes';

const createEngine = () => new CanvasEngine(12000, 12000);

const DEV_ROOM: RoomModel = {
  roomId: 'room-1',
  centerX: 0,
  centerY: 0,
  widthMm: 4000,
  heightMm: 3000,
  rotationDeg: 0,
};

export const CanvasV3DevScreen = () => {
  const engineRef = useRef<CanvasEngine>(createEngine());
  const [snapshot, setSnapshot] = useState<CanvasSnapshot>(engineRef.current.getSnapshot());
  const [debugState, setDebugState] = useState<CanvasDebugState>(engineRef.current.getDebugState());
  const dragRef = useRef({ x: 0, y: 0 });

  const refreshState = () => {
    setSnapshot(engineRef.current.getSnapshot());
    setDebugState(engineRef.current.getDebugState());
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    engineRef.current.setViewport({ width, height });
    refreshState();
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
          refreshState();
        },
      }),
    [],
  );

  const worldOrigin: ScreenPoint = engineRef.current.worldToScreen({ x: 0, y: 0 });
  const worldOriginMarker: ScreenPoint = engineRef.current.worldToScreen(debugState.worldCenter);
  const roomGeometry = engineRef.current.getRoomScreenGeometry(DEV_ROOM);

  return (
    <View style={styles.root}>
      <AppHeader title="Canvas V3 Dev" />

      <View style={styles.inspectorPanel}>
        <Text style={styles.inspectorTitle}>Dev Inspector</Text>
        <Text style={styles.metaText}>zoom: {debugState.zoom.toFixed(2)}</Text>
        <Text style={styles.metaText}>
          pan: ({debugState.panX.toFixed(1)}, {debugState.panY.toFixed(1)})
        </Text>
        <Text style={styles.metaText}>
          viewport: {debugState.viewport.width.toFixed(0)} × {debugState.viewport.height.toFixed(0)}
        </Text>
        <Text style={styles.metaText}>
          world origin: ({debugState.worldCenter.x.toFixed(1)}, {debugState.worldCenter.y.toFixed(1)})
        </Text>
        <Text style={styles.metaText}>
          screen center: ({debugState.screenCenter.x.toFixed(1)}, {debugState.screenCenter.y.toFixed(1)})
        </Text>
        <Text style={styles.metaText}>
          world@screen center: ({debugState.worldAtScreenCenter.x.toFixed(1)}, {debugState.worldAtScreenCenter.y.toFixed(1)})
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={styles.zoomButton}
          onPress={() => {
            engineRef.current.zoomBy(0.8);
            refreshState();
          }}
        >
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
        <Pressable
          style={styles.zoomButton}
          onPress={() => {
            engineRef.current.zoomBy(1.25);
            refreshState();
          }}
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </Pressable>
        <Pressable
          style={styles.resetButton}
          onPress={() => {
            engineRef.current.resetView();
            refreshState();
          }}
        >
          <Text style={styles.resetButtonText}>Reset View</Text>
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

          <View
            style={[
              styles.viewportXAxis,
              {
                top: debugState.screenCenter.y,
              },
            ]}
          />
          <View
            style={[
              styles.viewportYAxis,
              {
                left: debugState.screenCenter.x,
              },
            ]}
          />

          <View
            style={[
              styles.worldXAxis,
              {
                top: worldOrigin.y,
              },
            ]}
          />
          <View
            style={[
              styles.worldYAxis,
              {
                left: worldOrigin.x,
              },
            ]}
          />

          <View
            style={[
              styles.worldCenterMarker,
              {
                left: worldOriginMarker.x - 4,
                top: worldOriginMarker.y - 4,
              },
            ]}
          />

          <View
            style={[
              styles.viewportCenterMarker,
              {
                left: debugState.screenCenter.x - 5,
                top: debugState.screenCenter.y - 5,
              },
            ]}
          />


          {roomGeometry.edges.map((edge) => (
            <View
              key={edge.id}
              pointerEvents="none"
              style={[
                styles.roomEdge,
                {
                  width: edge.length,
                  left: edge.center.x - edge.length / 2,
                  top: edge.center.y - 1,
                  transform: [{ rotate: `${edge.angleDeg}deg` }],
                },
              ]}
            />
          ))}

          {roomGeometry.corners.map((corner, index) => (
            <View
              key={`${roomGeometry.roomId}-corner-${index}`}
              pointerEvents="none"
              style={[
                styles.roomCornerMarker,
                {
                  left: corner.x - 3,
                  top: corner.y - 3,
                },
              ]}
            />
          ))}

          <View
            style={[
              styles.roomCenterMarker,
              {
                left: roomGeometry.center.x - 5,
                top: roomGeometry.center.y - 5,
              },
            ]}
            pointerEvents="none"
          />

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
  inspectorPanel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EEF7',
    gap: 4,
    backgroundColor: '#F5F8FF',
  },
  inspectorTitle: {
    color: '#1D2D4A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaText: {
    color: '#24324A',
    fontSize: 13,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    alignItems: 'center',
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
  resetButton: {
    height: 42,
    borderRadius: 10,
    backgroundColor: '#203054',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  viewportXAxis: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 122, 0, 0.45)',
  },
  viewportYAxis: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 122, 0, 0.45)',
  },
  worldXAxis: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(220, 38, 38, 0.6)',
  },
  worldYAxis: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(220, 38, 38, 0.6)',
  },
  worldCenterMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  viewportCenterMarker: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2D5BFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  roomEdge: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#2D5BFF',
  },
  roomCornerMarker: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D4ED8',
  },
  roomCenterMarker: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#93C5FD',
    borderWidth: 2,
    borderColor: '#1D4ED8',
  },
});
