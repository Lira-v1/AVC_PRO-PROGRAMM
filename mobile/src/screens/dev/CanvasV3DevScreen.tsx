import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { CanvasEngine } from '../../engineering/canvasV3/CanvasEngine';
import { CanvasDebugState, CanvasSnapshot, RoomModel, ScreenPoint } from '../../engineering/canvasV3/CanvasTypes';

const ZOOM_OUT_FACTOR = 0.8;
const ZOOM_IN_FACTOR = 1.25;
const ZOOM_OUT_LABEL = `−${Math.round((1 - ZOOM_OUT_FACTOR) * 100)}%`;
const ZOOM_IN_LABEL = `+${Math.round((ZOOM_IN_FACTOR - 1) * 100)}%`;
const DRAG_THRESHOLD_PX = 3;

type DragMode = 'idle' | 'room' | 'pan';

type DragSession = {
  mode: DragMode;
  pointerId: number | null;
  started: boolean;
  moved: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

const IDLE_DRAG_SESSION: DragSession = {
  mode: 'idle',
  pointerId: null,
  started: false,
  moved: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
};

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

const formatDebugText = (debugState: CanvasDebugState) => {
  const viewport = `${debugState.viewport.width.toFixed(0)} × ${debugState.viewport.height.toFixed(0)}`;
  const roomIds = debugState.roomIds.length ? debugState.roomIds.join(', ') : 'none';

  return [
    `zoom: ${debugState.zoom.toFixed(2)}`,
    `zoomPercent: ${debugState.zoomPercent}%`,
    `panX: ${debugState.panX.toFixed(1)}`,
    `panY: ${debugState.panY.toFixed(1)}`,
    `viewport: ${viewport}`,
    `roomIds: ${roomIds}`,
    `activeRoomId: ${debugState.activeRoomId ?? 'null'}`,
    `isDraggingRoom: ${debugState.isDraggingRoom ? 'true' : 'false'}`,
  ].join('\n');
};

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return;
  }

  throw new Error('Clipboard API is unavailable');
};

export const CanvasV3DevScreen = () => {
  const engineRef = useRef<CanvasEngine>(createEngine());
  const canvasRef = useRef<View | null>(null);
  const dragSessionRef = useRef<DragSession>(IDLE_DRAG_SESSION);
  const [snapshot, setSnapshot] = useState<CanvasSnapshot>(engineRef.current.getSnapshot());
  const [debugState, setDebugState] = useState<CanvasDebugState>(engineRef.current.getDebugState());
  const [isInspectorVisible, setInspectorVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const refreshState = useCallback(() => {
    setSnapshot(engineRef.current.getSnapshot());
    setDebugState(engineRef.current.getDebugState());
  }, []);

  const resetDragSession = useCallback(() => {
    dragSessionRef.current = { ...IDLE_DRAG_SESSION };
    engineRef.current.endDrag();
  }, []);

  const toScreenPoint = useCallback((nativeEvent: { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number }) => {
    const x = nativeEvent.locationX ?? nativeEvent.offsetX ?? 0;
    const y = nativeEvent.locationY ?? nativeEvent.offsetY ?? 0;

    return { x, y };
  }, []);

  const applyZoom = useCallback(
    (factor: number) => {
      engineRef.current.zoomBy(factor);
      refreshState();
    },
    [refreshState],
  );

  const beginInteraction = useCallback(
    (screenPoint: ScreenPoint, pointerId?: number) => {
      const activeRoomIdBeforePress = engineRef.current.getActiveRoomId();
      const hitRoomId = engineRef.current.getRoomIdAtScreenPoint(screenPoint);
      const activeRoomId = engineRef.current.handleTap(screenPoint);
      const shouldDragRoom = Boolean(hitRoomId && activeRoomIdBeforePress === hitRoomId && activeRoomId === hitRoomId);

      dragSessionRef.current = {
        mode: shouldDragRoom ? 'room' : 'pan',
        pointerId: pointerId ?? null,
        started: true,
        moved: false,
        startX: screenPoint.x,
        startY: screenPoint.y,
        lastX: screenPoint.x,
        lastY: screenPoint.y,
      };

      if (shouldDragRoom) {
        engineRef.current.startDrag();
      } else {
        engineRef.current.endDrag();
      }

      refreshState();
    },
    [refreshState],
  );

  const moveInteraction = useCallback(
    (screenPoint: ScreenPoint, pointerId?: number) => {
      const session = dragSessionRef.current;

      if (!session.started) {
        return;
      }

      if (session.pointerId !== null && pointerId !== undefined && session.pointerId !== pointerId) {
        return;
      }

      engineRef.current.updateLastPointer(screenPoint);

      const deltaX = screenPoint.x - session.lastX;
      const deltaY = screenPoint.y - session.lastY;
      const totalDx = screenPoint.x - session.startX;
      const totalDy = screenPoint.y - session.startY;
      const didCrossThreshold = Math.hypot(totalDx, totalDy) >= DRAG_THRESHOLD_PX;

      dragSessionRef.current = {
        ...session,
        moved: session.moved || didCrossThreshold,
        lastX: screenPoint.x,
        lastY: screenPoint.y,
      };

      if (!didCrossThreshold) {
        refreshState();
        return;
      }

      if (session.mode === 'room') {
        engineRef.current.dragBy({ x: deltaX, y: deltaY });
      } else {
        engineRef.current.panBy(deltaX, deltaY);
      }

      refreshState();
    },
    [refreshState],
  );

  const endInteraction = useCallback(
    (screenPoint?: ScreenPoint, pointerId?: number) => {
      const session = dragSessionRef.current;

      if (!session.started) {
        return;
      }

      if (session.pointerId !== null && pointerId !== undefined && session.pointerId !== pointerId) {
        return;
      }

      if (screenPoint) {
        engineRef.current.updateLastPointer(screenPoint);
      }

      resetDragSession();
      refreshState();
    },
    [refreshState, resetDragSession],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      engineRef.current.setViewport({ width, height });
      refreshState();
    },
    [refreshState],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const canvasNode = canvasRef.current as unknown as { addEventListener?: Function; removeEventListener?: Function } | null;

    if (!canvasNode?.addEventListener) {
      return undefined;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyZoom(event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR);
    };

    canvasNode.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvasNode.removeEventListener?.('wheel', onWheel);
    };
  }, [applyZoom]);

  useEffect(() => {
    if (copyStatus === 'idle') {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setCopyStatus('idle');
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [copyStatus]);

  const responderHandlers = useMemo(
    () => ({
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: (event: any) => {
        beginInteraction(toScreenPoint(event.nativeEvent), event.nativeEvent.pointerId);
      },
      onResponderMove: (event: any) => {
        moveInteraction(toScreenPoint(event.nativeEvent), event.nativeEvent.pointerId);
      },
      onResponderRelease: (event: any) => {
        endInteraction(toScreenPoint(event.nativeEvent), event.nativeEvent.pointerId);
      },
      onResponderTerminate: (event: any) => {
        endInteraction(toScreenPoint(event.nativeEvent), event.nativeEvent.pointerId);
      },
      onResponderTerminationRequest: () => false,
    }),
    [beginInteraction, endInteraction, moveInteraction, toScreenPoint],
  );

  const roomGeometries = engineRef.current.getRooms().map((room) => engineRef.current.getRoomScreenGeometry(room));
  const debugInspectorText = useMemo(() => formatDebugText(debugState), [debugState]);

  const handleCopyInspector = useCallback(async () => {
    try {
      await copyTextToClipboard(debugInspectorText);
      setCopyStatus('success');
    } catch (error) {
      setCopyStatus('error');
    }
  }, [debugInspectorText]);

  return (
    <View style={styles.root}>
      <AppHeader title="Canvas V3 Dev" />

      <View style={styles.controlsRow}>
        <Pressable style={styles.zoomButton} onPress={() => applyZoom(ZOOM_OUT_FACTOR)}>
          <Text style={styles.zoomButtonText}>{ZOOM_OUT_LABEL}</Text>
        </Pressable>
        <Pressable style={styles.zoomButton} onPress={() => applyZoom(ZOOM_IN_FACTOR)}>
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
        <Pressable
          style={[styles.secondaryButton, isInspectorVisible ? styles.secondaryButtonActive : null]}
          onPress={() => {
            setInspectorVisible((current) => !current);
            setCopyStatus('idle');
          }}
        >
          <Text style={styles.secondaryButtonText}>{isInspectorVisible ? 'Hide Inspector' : 'Inspector'}</Text>
        </Pressable>
      </View>

      <View ref={canvasRef} style={styles.canvasArea} onLayout={onLayout} {...responderHandlers}>
        {snapshot.grid.lines.map((line) => (
          <View
            key={line.id}
            pointerEvents="none"
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

        {roomGeometries.map((roomGeometry) => (
          <React.Fragment key={roomGeometry.roomId}>
            <View
              pointerEvents="none"
              style={[
                styles.roomFill,
                roomGeometry.isActive ? styles.roomFillActive : styles.roomFillInactive,
                {
                  left: roomGeometry.bounds.left,
                  top: roomGeometry.bounds.top,
                  width: roomGeometry.bounds.width,
                  height: roomGeometry.bounds.height,
                },
              ]}
            />

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

        {isInspectorVisible ? (
          <View style={styles.inspectorOverlay} pointerEvents="box-none">
            <View style={styles.inspectorPopup}>
              <View style={styles.inspectorHeader}>
                <View style={styles.inspectorTitleBlock}>
                  <Text style={styles.inspectorTitle}>Dev Inspector</Text>
                  <Text style={styles.zoomIndicator}>Zoom: {debugState.zoomPercent}%</Text>
                </View>
                <Pressable style={styles.inspectorCloseButton} onPress={() => setInspectorVisible(false)}>
                  <Text style={styles.inspectorCloseButtonText}>✕</Text>
                </Pressable>
              </View>

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
              <Text style={styles.metaText}>
                lastPointerWorld: {debugState.lastPointerWorldX === null || debugState.lastPointerWorldY === null ? 'null' : `(${debugState.lastPointerWorldX.toFixed(1)}, ${debugState.lastPointerWorldY.toFixed(1)})`}
              </Text>

              <View style={styles.inspectorActions}>
                <Pressable style={styles.copyButton} onPress={handleCopyInspector}>
                  <Text style={styles.copyButtonText}>Copy</Text>
                </Pressable>
                {copyStatus === 'success' ? <Text style={styles.copyStatusSuccess}>Copied</Text> : null}
                {copyStatus === 'error' ? <Text style={styles.copyStatusError}>Copy unavailable</Text> : null}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
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
  secondaryButton: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9D6EA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonActive: {
    backgroundColor: '#EEF4FF',
    borderColor: '#2D5BFF',
  },
  secondaryButtonText: {
    color: '#203054',
    fontSize: 13,
    fontWeight: '700',
  },
  canvasArea: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2F4',
    overflow: 'hidden',
    backgroundColor: '#F9FBFF',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#D3DFF5',
  },
  inspectorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 12,
  },
  inspectorPopup: {
    width: 320,
    maxWidth: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E2F5',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    gap: 4,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  inspectorTitleBlock: {
    flex: 1,
    gap: 2,
  },
  inspectorTitle: {
    color: '#1D2D4A',
    fontSize: 14,
    fontWeight: '700',
  },
  inspectorCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorCloseButtonText: {
    color: '#203054',
    fontSize: 14,
    fontWeight: '700',
  },
  zoomIndicator: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  metaText: {
    color: '#24324A',
    fontSize: 13,
  },
  inspectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  copyButton: {
    height: 34,
    borderRadius: 8,
    backgroundColor: '#203054',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  copyStatusSuccess: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  copyStatusError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  roomFill: {
    position: 'absolute',
    borderRadius: 8,
  },
  roomFillInactive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  roomFillActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.45)',
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
