import React, { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { CanvasEngine } from '../../engineering/canvasV3/CanvasEngine';
import { CanvasDebugState, CanvasSnapshot, RoomModel, ScreenPoint } from '../../engineering/canvasV3/CanvasTypes';

const ZOOM_OUT_FACTOR = 0.8;
const ZOOM_IN_FACTOR = 1.25;
const ZOOM_OUT_LABEL = `−${Math.round((1 - ZOOM_OUT_FACTOR) * 100)}%`;
const ZOOM_IN_LABEL = `+${Math.round((ZOOM_IN_FACTOR - 1) * 100)}%`;

const DEV_ROOM: RoomModel = {
  roomId: 'room-1',
  centerX: 0,
  centerY: 0,
  widthMm: 4000,
  heightMm: 3000,
  rotationDeg: 0,
};

const createEngine = () => {
  const engine = new CanvasEngine(12000, 12000);
  engine.setRooms([DEV_ROOM]);
  return engine;
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
    const screenPoint = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    const world = engineRef.current.screenToWorld(screenPoint);
    const snapped = engineRef.current.snapToGrid(world);
    const activeRoomId = engineRef.current.handleTap(screenPoint);
    console.log('[CanvasV3Dev] world:', world, 'snapped:', snapped, 'activeRoomId:', activeRoomId);
    refreshState();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: (event) => {
          dragRef.current = { x: 0, y: 0 };
          const screenPoint = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
          const activeRoomId = engineRef.current.handleTap(screenPoint);

          if (activeRoomId) {
            engineRef.current.startDrag();
          }

          refreshState();
        },
        onPanResponderMove: (_, gestureState) => {
          const deltaX = gestureState.dx - dragRef.current.x;
          const deltaY = gestureState.dy - dragRef.current.y;
          dragRef.current = { x: gestureState.dx, y: gestureState.dy };

          const movedRoom = engineRef.current.dragBy({ x: deltaX, y: deltaY });

          if (!movedRoom) {
            engineRef.current.panBy(deltaX, deltaY);
          }

          refreshState();
        },
        onPanResponderRelease: () => {
          engineRef.current.endDrag();
          dragRef.current = { x: 0, y: 0 };
          refreshState();
        },
        onPanResponderTerminate: () => {
          engineRef.current.endDrag();
          dragRef.current = { x: 0, y: 0 };
          refreshState();
        },
      }),
    [],
  );

  const worldOrigin: ScreenPoint = engineRef.current.worldToScreen({ x: 0, y: 0 });
  const worldOriginMarker: ScreenPoint = engineRef.current.worldToScreen(debugState.worldCenter);
  const roomGeometries = engineRef.current.getRooms().map((room) => engineRef.current.getRoomScreenGeometry(room));

  return (
    <View style={styles.root}>
      <AppHeader title="Canvas V3 Dev" />

      <View style={styles.inspectorPanel}>
        <Text style={styles.inspectorTitle}>Dev Inspector</Text>
        <Text style={styles.metaText}>
          zoom: {debugState.zoom.toFixed(2)} ({debugState.zoomPercent}%)
        </Text>
        <Text style={styles.metaText}>
          zoom range: {debugState.minZoom.toFixed(2)}–{debugState.maxZoom.toFixed(2)} ({Math.round(debugState.minZoom * 100)}%–{Math.round(debugState.maxZoom * 100)}%)
        </Text>
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
        <Text style={styles.metaText}>roomIds: {debugState.roomIds.length ? debugState.roomIds.join(', ') : 'none'}</Text>
        <Text style={styles.metaText}>activeRoomId: {snapshot.activeRoomId ?? 'null'}</Text>
        <Text style={styles.metaText}>isDraggingRoom: {debugState.isDraggingRoom ? 'true' : 'false'}</Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={styles.zoomButton}
          onPress={() => {
            engineRef.current.zoomBy(ZOOM_OUT_FACTOR);
            refreshState();
          }}
        >
          <Text style={styles.zoomButtonText}>{ZOOM_OUT_LABEL}</Text>
        </Pressable>
        <Pressable
          style={styles.zoomButton}
          onPress={() => {
            engineRef.current.zoomBy(ZOOM_IN_FACTOR);
            refreshState();
          }}
        >
          <Text style={styles.zoomButtonText}>{ZOOM_IN_LABEL}</Text>
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

          {roomGeometries.map((roomGeometry) => (
            <React.Fragment key={roomGeometry.roomId}>
              {roomGeometry.edges.map((edge) => (
                <View
                  key={edge.id}
                  pointerEvents="none"
                  style={[
                    styles.roomEdge,
                    roomGeometry.isActive ? styles.roomEdgeActive : styles.roomEdgeInactive,
                    {
                      width: edge.length,
                      left: edge.center.x - edge.length / 2,
                      top: edge.center.y - (roomGeometry.isActive ? 2 : 1),
                      height: roomGeometry.isActive ? 4 : 2,
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
                    roomGeometry.isActive ? styles.roomCornerMarkerActive : null,
                    {
                      left: corner.x - (roomGeometry.isActive ? 4 : 3),
                      top: corner.y - (roomGeometry.isActive ? 4 : 3),
                    },
                  ]}
                />
              ))}

              <View
                style={[
                  styles.roomCenterMarker,
                  roomGeometry.isActive ? styles.roomCenterMarkerActive : null,
                  {
                    left: roomGeometry.center.x - (roomGeometry.isActive ? 7 : 5),
                    top: roomGeometry.center.y - (roomGeometry.isActive ? 7 : 5),
                  },
                ]}
                pointerEvents="none"
              />
            </React.Fragment>
          ))}
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
    minWidth: 68,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2D5BFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  zoomButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
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
    borderRadius: 999,
  },
  roomEdgeInactive: {
    backgroundColor: '#2D5BFF',
  },
  roomEdgeActive: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
    shadowOpacity: 0.28,
    shadowRadius: 4,
  },
  roomCornerMarker: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D4ED8',
  },
  roomCornerMarkerActive: {
    backgroundColor: '#EA580C',
    width: 8,
    height: 8,
    borderRadius: 4,
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
  roomCenterMarkerActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FDBA74',
    borderColor: '#EA580C',
    borderWidth: 3,
  },
});
