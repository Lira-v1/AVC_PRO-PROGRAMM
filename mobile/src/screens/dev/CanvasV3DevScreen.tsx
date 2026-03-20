import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { CanvasEngine } from '../../engineering/canvasV3/CanvasEngine';
import { CanvasDebugState, CanvasSnapshot, RoomModel, ScreenPoint } from '../../engineering/canvasV3/CanvasTypes';

const ZOOM_OUT_FACTOR = 0.8;
const ZOOM_IN_FACTOR = 1.25;
const DRAG_THRESHOLD_PX = 3;

type DragMode = 'idle' | 'room' | 'resize' | 'pan';

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
  widthMm: 1000,
  heightMm: 1000,
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
  const displayZoomLabel = `${debugState.displayZoom > 0 ? '+' : ''}${debugState.displayZoom.toFixed(2)}`;

  return [
    `cameraZoom: ${debugState.cameraZoom.toFixed(3)}`,
    `displayZoom: ${displayZoomLabel}`,
    `zoomPercent: ${debugState.zoomPercent}%`,
    `panX: ${debugState.panX.toFixed(1)}`,
    `panY: ${debugState.panY.toFixed(1)}`,
    `viewport: ${viewport}`,
    `roomIds: ${roomIds}`,
    `activeRoomId: ${debugState.activeRoomId ?? 'null'}`,
    `isDraggingRoom: ${debugState.isDraggingRoom ? 'true' : 'false'}`,
    `isResizingRoom: ${debugState.isResizingRoom ? 'true' : 'false'}`,
    `activeResizeHandleId: ${debugState.activeResizeHandleId ?? 'null'}`,
    `activeRoomRotationDeg: ${debugState.activeRoomRotationDeg ?? 'null'}`,
    `gridStepMm: ${debugState.gridStepMm}`,
    `gridLevel: ${debugState.gridLevel}`,
    `cellsPerMeter: ${debugState.cellsPerMeter}`,
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

const formatZoomState = (displayZoom: number) => `${displayZoom > 0 ? '+' : ''}${displayZoom.toFixed(0)}`;
const formatRoomTitle = (_roomId: string, index: number) => `Комната ${index + 1}`;

export const CanvasV3DevScreen = () => {
  const engineRef = useRef<CanvasEngine>(createEngine());
  const canvasRef = useRef<View | null>(null);
  const dragSessionRef = useRef<DragSession>(IDLE_DRAG_SESSION);
  const { height: windowHeight } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState<CanvasSnapshot>(engineRef.current.getSnapshot());
  const [debugState, setDebugState] = useState<CanvasDebugState>(engineRef.current.getDebugState());
  const [isInspectorVisible, setInspectorVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isGridVisible, setGridVisible] = useState(true);
  const [isFullscreenMode, setFullscreenMode] = useState(false);
  const [isRoomSettingsMenuOpen, setRoomSettingsMenuOpen] = useState(false);
  const [roomMenuSection, setRoomMenuSection] = useState<'root' | 'settings'>('root');

  const refreshState = useCallback(() => {
    setSnapshot(engineRef.current.getSnapshot());
    setDebugState(engineRef.current.getDebugState());
  }, []);

  const resetDragSession = useCallback(() => {
    dragSessionRef.current = { ...IDLE_DRAG_SESSION };
    engineRef.current.endDrag();
    engineRef.current.endResize();
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
      const resizeHandleId = engineRef.current.getResizeHandleAtScreenPoint(screenPoint);
      const activeRoomIdBeforePress = engineRef.current.getActiveRoomId();
      const hitRoomId = engineRef.current.getRoomIdAtScreenPoint(screenPoint);
      const shouldResizeRoom = Boolean(resizeHandleId && activeRoomIdBeforePress);
      const activeRoomId = shouldResizeRoom ? activeRoomIdBeforePress : engineRef.current.handleTap(screenPoint);
      const shouldDragRoom = !shouldResizeRoom && Boolean(hitRoomId && activeRoomIdBeforePress === hitRoomId && activeRoomId === hitRoomId);

      dragSessionRef.current = {
        mode: shouldResizeRoom ? 'resize' : shouldDragRoom ? 'room' : 'pan',
        pointerId: pointerId ?? null,
        started: true,
        moved: false,
        startX: screenPoint.x,
        startY: screenPoint.y,
        lastX: screenPoint.x,
        lastY: screenPoint.y,
      };

      if (shouldResizeRoom && resizeHandleId) {
        engineRef.current.startResize(resizeHandleId);
      } else if (shouldDragRoom) {
        engineRef.current.startDrag();
      } else {
        engineRef.current.endDrag();
        engineRef.current.endResize();
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
      } else if (session.mode === 'resize') {
        engineRef.current.resizeBy({ x: deltaX, y: deltaY });
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
  const resizeHandles = engineRef.current.getActiveRoomResizeHandles();
  const dimensionLabels = engineRef.current.getActiveRoomDimensionLabels();
  const roomData = engineRef.current.getRooms();
  const activeRoomGeometry = roomGeometries.find((roomGeometry) => roomGeometry.isActive) ?? null;
  const debugInspectorText = useMemo(() => formatDebugText(debugState), [debugState]);
  const displayZoomLabel = `${debugState.displayZoom > 0 ? '+' : ''}${debugState.displayZoom.toFixed(2)}`;
  const zoomStateLabel = formatZoomState(debugState.displayZoom);
  const canvasHeight = isFullscreenMode ? Math.max(windowHeight - 180, 520) : Math.max(Math.min(windowHeight * 0.62, 720), 420);

  const handleCopyInspector = useCallback(async () => {
    try {
      await copyTextToClipboard(debugInspectorText);
      setCopyStatus('success');
    } catch (error) {
      setCopyStatus('error');
    }
  }, [debugInspectorText]);

  const handleRotateRoom = useCallback(() => {
    engineRef.current.rotateActiveRoom();
    setRoomSettingsMenuOpen(false);
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (!snapshot.activeRoomId) {
      setRoomSettingsMenuOpen(false);
      setRoomMenuSection('root');
    }
  }, [snapshot.activeRoomId]);

  return (
    <View style={styles.root}>
      <AppHeader title="Canvas V3 Dev" />

      <ScrollView style={styles.pageScroll} contentContainerStyle={[styles.pageContent, isFullscreenMode ? styles.pageContentFullscreen : null]}>
        <View style={styles.controlsRow}>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_OUT_FACTOR)}>
            <Text style={styles.controlButtonText}>Зум -</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_IN_FACTOR)}>
            <Text style={styles.controlButtonText}>Зум +</Text>
          </Pressable>
          <Pressable
            style={[styles.controlButton, styles.resetButton]}
            onPress={() => {
              engineRef.current.resetView();
              refreshState();
            }}
          >
            <Text style={styles.controlButtonText}>Reset View</Text>
            <Text style={styles.controlButtonSubtext}>{zoomStateLabel}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, isInspectorVisible ? styles.controlButtonActive : null]} onPress={() => {
            setInspectorVisible((current) => !current);
            setCopyStatus('idle');
          }}>
            <Text style={styles.controlButtonText}>{isInspectorVisible ? 'Скрыть Inspector' : 'Inspector'}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, isFullscreenMode ? styles.controlButtonActive : null]} onPress={() => setFullscreenMode((current) => !current)}>
            <Text style={styles.controlButtonText}>{isFullscreenMode ? 'Свернуть экран' : 'Полный экран'}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, !isGridVisible ? styles.controlButtonActive : null]} onPress={() => setGridVisible((current) => !current)}>
            <Text style={styles.controlButtonText}>{isGridVisible ? 'Скрыть сетку' : 'Показать сетку'}</Text>
          </Pressable>
        </View>

        <View style={[styles.canvasShell, isFullscreenMode ? styles.canvasShellFullscreen : null]}>
          <View ref={canvasRef} style={[styles.canvasArea, { height: canvasHeight }]} onLayout={onLayout} {...responderHandlers}>
            {isGridVisible
              ? snapshot.grid.lines.map((line) => (
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
                ))
              : null}

            {roomGeometries.map((roomGeometry) => (
              <React.Fragment key={roomGeometry.roomId}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.roomFill,
                    roomGeometry.isActive ? styles.roomFillActive : styles.roomFillInactive,
                    {
                      width: roomGeometry.edges[0]?.length ?? roomGeometry.bounds.width,
                      height: roomGeometry.edges[1]?.length ?? roomGeometry.bounds.height,
                      left: roomGeometry.center.x - (roomGeometry.edges[0]?.length ?? roomGeometry.bounds.width) / 2,
                      top: roomGeometry.center.y - (roomGeometry.edges[1]?.length ?? roomGeometry.bounds.height) / 2,
                      transform: [{ rotate: `${roomGeometry.rotationDeg}deg` }],
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
                        top: edge.center.y - (roomGeometry.isActive ? 1.5 : 1),
                        height: roomGeometry.isActive ? 3 : 2,
                        transform: [{ rotate: `${edge.angleDeg}deg` }],
                      },
                    ]}
                  />
                ))}

              </React.Fragment>
            ))}

            {dimensionLabels.map((label) => {
              const lineLeft = Math.min(label.lineFrom.x, label.lineTo.x);
              const lineTop = Math.min(label.lineFrom.y, label.lineTo.y);
              const lineWidth = Math.max(Math.abs(label.lineTo.x - label.lineFrom.x), 1);
              const lineHeight = Math.max(Math.abs(label.lineTo.y - label.lineFrom.y), 1);
              const isHorizontal = label.axis === 'horizontal';

              return (
                <React.Fragment key={label.id}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionLine,
                      isHorizontal
                        ? {
                            left: lineLeft,
                            top: label.lineFrom.y,
                            width: lineWidth,
                            height: 1,
                          }
                        : {
                            left: label.lineFrom.x,
                            top: lineTop,
                            width: 1,
                            height: lineHeight,
                          },
                    ]}
                  />

                  {label.ticks.map((tick, tickIndex) => {
                    const tickLeft = Math.min(tick.from.x, tick.to.x);
                    const tickTop = Math.min(tick.from.y, tick.to.y);
                    const tickWidth = Math.max(Math.abs(tick.to.x - tick.from.x), 1);
                    const tickHeight = Math.max(Math.abs(tick.to.y - tick.from.y), 1);

                    return (
                      <View
                        key={`${label.id}-tick-${tickIndex}`}
                        pointerEvents="none"
                        style={[
                          styles.dimensionTick,
                          {
                            left: tickLeft,
                            top: tickTop,
                            width: tickWidth,
                            height: tickHeight,
                          },
                        ]}
                      />
                    );
                  })}

                  <Text
                    pointerEvents="none"
                    style={[
                      styles.dimensionValue,
                      isHorizontal
                        ? {
                            left: label.textAnchor.x - 30,
                            top: label.textAnchor.y - 22,
                            minWidth: 60,
                            textAlign: 'center',
                          }
                        : {
                            left: label.textAnchor.x - 52,
                            top: label.textAnchor.y - 10,
                            width: 72,
                            textAlign: 'center',
                            transform: [{ rotate: '-90deg' }],
                          },
                    ]}
                  >
                    {label.formattedValue}
                  </Text>
                </React.Fragment>
              );
            })}

            {resizeHandles.map((handle) => (
              <View
                key={`${handle.roomId}-${handle.handleId}-resize-handle`}
                pointerEvents="none"
                style={[
                  styles.resizeHandle,
                  handle.isActive ? styles.resizeHandleActive : null,
                  {
                    left: handle.point.x - (handle.isActive ? 8 : 7),
                    top: handle.point.y - (handle.isActive ? 8 : 7),
                  },
                ]}
              />
            ))}

            {activeRoomGeometry ? (
              <View pointerEvents="box-none" style={styles.roomOverlayControlsLayer}>
                <Pressable
                  style={[
                    styles.overlayControlButton,
                    {
                      left: activeRoomGeometry.bounds.right - 16,
                      top: activeRoomGeometry.bounds.top - 16,
                    },
                  ]}
                  onPress={() => {
                    setRoomMenuSection('root');
                    setRoomSettingsMenuOpen((current) => !current);
                  }}
                >
                  <Text style={styles.overlayControlIcon}>⚙</Text>
                </Pressable>

                {isRoomSettingsMenuOpen ? (
                  <View
                    style={[
                      styles.roomSettingsPopup,
                      {
                        left: Math.max(12, activeRoomGeometry.bounds.right - 180),
                        top: Math.max(12, activeRoomGeometry.bounds.top + 24),
                      },
                    ]}
                  >
                    {roomMenuSection === 'root' ? (
                      <>
                        <Text style={styles.roomSettingsPopupTitle}>Меню комнаты</Text>
                        <Pressable style={styles.roomSettingsMenuItem} onPress={() => setRoomMenuSection('settings')}>
                          <Text style={styles.roomSettingsMenuText}>Настройка комнаты</Text>
                        </Pressable>
                        <Pressable style={styles.roomSettingsMenuItem} onPress={handleRotateRoom}>
                          <Text style={styles.roomSettingsMenuText}>Поворот комнаты</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable style={styles.roomSettingsBackItem} onPress={() => setRoomMenuSection('root')}>
                          <Text style={styles.roomSettingsBackText}>← Назад</Text>
                        </Pressable>
                        <Text style={styles.roomSettingsPopupTitle}>Настройка комнаты</Text>
                        <Text style={styles.roomSettingsPopupPlaceholder}>Панель настроек комнаты будет расширена в Canvas V3.</Text>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}

            {isInspectorVisible ? (
              <View style={styles.inspectorOverlay} pointerEvents="box-none">
                <View style={styles.inspectorPopup}>
                  <View style={styles.inspectorHeader}>
                    <View style={styles.inspectorTitleBlock}>
                      <Text style={styles.inspectorTitle}>Dev Inspector</Text>
                      <Text style={styles.zoomIndicator}>Display Zoom: {displayZoomLabel}</Text>
                    </View>
                    <Pressable style={styles.inspectorCloseButton} onPress={() => setInspectorVisible(false)}>
                      <Text style={styles.inspectorCloseButtonText}>✕</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.metaText}>cameraZoom: {debugState.cameraZoom.toFixed(3)}</Text>
                  <Text style={styles.metaText}>displayZoom: {displayZoomLabel}</Text>
                  <Text style={styles.metaText}>camera zoom range: {debugState.minZoom.toFixed(3)}–{debugState.maxZoom.toFixed(2)}</Text>
                  <Text style={styles.metaText}>pan: ({debugState.panX.toFixed(1)}, {debugState.panY.toFixed(1)})</Text>
                  <Text style={styles.metaText}>viewport: {debugState.viewport.width.toFixed(0)} × {debugState.viewport.height.toFixed(0)}</Text>
                  <Text style={styles.metaText}>world origin: ({debugState.worldCenter.x.toFixed(1)}, {debugState.worldCenter.y.toFixed(1)})</Text>
                  <Text style={styles.metaText}>screen center: ({debugState.screenCenter.x.toFixed(1)}, {debugState.screenCenter.y.toFixed(1)})</Text>
                  <Text style={styles.metaText}>world@screen center: ({debugState.worldAtScreenCenter.x.toFixed(1)}, {debugState.worldAtScreenCenter.y.toFixed(1)})</Text>
                  <Text style={styles.metaText}>roomIds: {debugState.roomIds.length ? debugState.roomIds.join(', ') : 'none'}</Text>
                  <Text style={styles.metaText}>gridStepMm: {debugState.gridStepMm}</Text>
                  <Text style={styles.metaText}>gridLevel: {debugState.gridLevel}</Text>
                  <Text style={styles.metaText}>cellsPerMeter: {debugState.cellsPerMeter}</Text>
                  <Text style={styles.metaText}>activeRoomId: {snapshot.activeRoomId ?? 'null'}</Text>
                  <Text style={styles.metaText}>isDraggingRoom: {debugState.isDraggingRoom ? 'true' : 'false'}</Text>
                  <Text style={styles.metaText}>isResizingRoom: {debugState.isResizingRoom ? 'true' : 'false'}</Text>
                  <Text style={styles.metaText}>activeResizeHandleId: {debugState.activeResizeHandleId ?? 'null'}</Text>
                  <Text style={styles.metaText}>activeRoomRotationDeg: {debugState.activeRoomRotationDeg ?? 'null'}</Text>
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

        {!isFullscreenMode ? (
          <>
            <View style={styles.ribbonCard}>
              <View style={styles.ribbonTextBlock}>
                <Text style={styles.ribbonTitle}>Диалоговая лента Canvas V3</Text>
                <Text style={styles.ribbonSubtitle}>Временный UI-блок в стиле Canvas V2 для будущего сценария ввода команд и сообщений.</Text>
              </View>
              <View style={styles.ribbonInputRow}>
                <TextInput
                  editable={false}
                  placeholder="Введите сообщение или команду для Canvas..."
                  placeholderTextColor="#94A3B8"
                  style={styles.ribbonInput}
                  value=""
                />
                <Pressable style={styles.sendButton}>
                  <Text style={styles.sendButtonText}>Отправить</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.sectionTitle}>Данные комнат из engine state</Text>
              <Text style={styles.sectionSubtitle}>Временный текстовый блок под canvas для быстрого контроля параметров сцены.</Text>
              <View style={styles.roomCardsWrap}>
                {roomData.map((room, index) => (
                  <View key={room.roomId} style={styles.roomDataCard}>
                    <Text style={styles.roomDataTitle}>{formatRoomTitle(room.roomId, index)}</Text>
                    <Text style={styles.roomDataMeta}>roomId: {room.roomId}</Text>
                    <Text style={styles.roomDataMeta}>centerX: {room.centerX}</Text>
                    <Text style={styles.roomDataMeta}>centerY: {room.centerY}</Text>
                    <Text style={styles.roomDataMeta}>widthMm: {room.widthMm}</Text>
                    <Text style={styles.roomDataMeta}>heightMm: {room.heightMm}</Text>
                    <Text style={styles.roomDataMeta}>rotationDeg: {room.rotationDeg}</Text>
                    <Text style={styles.roomDataMeta}>gridStepMm: {debugState.gridStepMm}</Text>
                    <Text style={styles.roomDataMeta}>gridLevel: {debugState.gridLevel}</Text>
                    <Text style={styles.roomDataMeta}>cellsPerMeter: {debugState.cellsPerMeter}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 14,
  },
  pageContentFullscreen: {
    paddingBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  controlButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  controlButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFD3F7',
  },
  controlButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  controlButtonSubtext: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  resetButton: {
    minWidth: 112,
  },
  canvasShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  canvasShellFullscreen: {
    padding: 8,
  },
  canvasArea: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2F4',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#D6DFEF',
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
    backgroundColor: 'rgba(15, 23, 42, 0.02)',
  },
  roomFillActive: {
    backgroundColor: 'rgba(95, 183, 198, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(95, 183, 198, 0.24)',
  },
  roomEdge: {
    position: 'absolute',
    borderRadius: 999,
  },
  roomEdgeInactive: {
    backgroundColor: '#111827',
  },
  roomEdgeActive: {
    backgroundColor: '#5FB7C6',
    shadowColor: '#5FB7C6',
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  resizeHandle: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5FB7C6',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  resizeHandleActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E8F7FA',
    borderColor: '#5FB7C6',
    borderWidth: 2,
  },
  dimensionLine: {
    position: 'absolute',
    backgroundColor: '#475569',
  },
  dimensionTick: {
    position: 'absolute',
    backgroundColor: '#475569',
  },
  dimensionValue: {
    position: 'absolute',
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  roomOverlayControlsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayControlButton: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#5FB7C6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  overlayControlIcon: {
    color: '#3A96A7',
    fontSize: 15,
    fontWeight: '700',
  },
  roomSettingsPopup: {
    position: 'absolute',
    width: 180,
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7E8ED',
    backgroundColor: 'rgba(255,255,255,0.98)',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    gap: 4,
  },
  roomSettingsPopupTitle: {
    color: '#1D2D4A',
    fontSize: 13,
    fontWeight: '700',
  },
  roomSettingsPopupPlaceholder: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  roomSettingsMenuItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F2FBFC',
  },
  roomSettingsMenuText: {
    color: '#2F7F8D',
    fontSize: 13,
    fontWeight: '600',
  },
  roomSettingsBackItem: {
    paddingVertical: 2,
  },
  roomSettingsBackText: {
    color: '#3A96A7',
    fontSize: 12,
    fontWeight: '600',
  },
  ribbonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    padding: 16,
    gap: 14,
  },
  ribbonTextBlock: {
    gap: 4,
  },
  ribbonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  ribbonSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  ribbonInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ribbonInput: {
    flex: 1,
    minWidth: 220,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: '#0F172A',
  },
  sendButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  roomCardsWrap: {
    gap: 10,
  },
  roomDataCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
    gap: 4,
  },
  roomDataTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  roomDataMeta: {
    color: '#334155',
    fontSize: 13,
  },
});
