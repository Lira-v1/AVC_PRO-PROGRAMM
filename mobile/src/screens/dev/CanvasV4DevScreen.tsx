import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../components/AppHeader';

type Point = {
  x: number;
  y: number;
};

type ToolMode = 'idle' | 'line' | 'polyline' | 'select';

type CanvasV4LineEntity = {
  entityId: string;
  lineId: string;
  entityType: 'line' | 'polyline-segment';
  polylineId?: string;
  startPoint: Point;
  endPoint: Point;
  length: number;
  angle: number;
};

type UndoAction =
  | { type: 'CREATE_LINE'; entityId: string }
  | { type: 'CREATE_POLYLINE_SEGMENT'; entityId: string }
  | { type: 'DELETE_ENTITY'; entity: CanvasV4LineEntity; index: number };

type DragSession = {
  started: boolean;
  moved: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

const GRID_STEP_MM = 100;
const DEFAULT_ZOOM = 0.08;
const MIN_ZOOM = 0.025;
const MAX_ZOOM = 0.6;
const ZOOM_OUT_FACTOR = 0.8;
const ZOOM_IN_FACTOR = 1.25;
const DRAG_THRESHOLD_PX = 3;
const HIT_TOLERANCE_PX = 12;
const SNAP_ANGLE_STEP_DEG = 45;

const EMPTY_DRAG_SESSION: DragSession = {
  started: false,
  moved: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
};

const normalizeAngle = (angle: number) => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const formatAngle = (angle: number) => {
  const normalized = normalizeAngle(angle);
  return normalized > 180 ? normalized - 360 : normalized;
};

const getLineMetrics = (startPoint: Point, endPoint: Point) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  return {
    length: Math.hypot(dx, dy),
    angle: normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI),
  };
};

const snapPointToGrid = (point: Point): Point => ({
  x: Math.round(point.x / GRID_STEP_MM) * GRID_STEP_MM,
  y: Math.round(point.y / GRID_STEP_MM) * GRID_STEP_MM,
});

const snapEndPoint = (startPoint: Point, rawEndPoint: Point): Point => {
  const gridEndPoint = snapPointToGrid(rawEndPoint);
  const dx = gridEndPoint.x - startPoint.x;
  const dy = gridEndPoint.y - startPoint.y;

  if (dx === 0 && dy === 0) {
    return gridEndPoint;
  }

  const snappedAngle = normalizeAngle(Math.round((Math.atan2(dy, dx) * 180) / Math.PI / SNAP_ANGLE_STEP_DEG) * SNAP_ANGLE_STEP_DEG);
  const horizontalSign = Math.cos((snappedAngle * Math.PI) / 180) >= 0 ? 1 : -1;
  const verticalSign = Math.sin((snappedAngle * Math.PI) / 180) >= 0 ? 1 : -1;

  if (snappedAngle === 0 || snappedAngle === 180) {
    const xSteps = Math.max(1, Math.round(Math.abs(dx) / GRID_STEP_MM));
    return { x: startPoint.x + horizontalSign * xSteps * GRID_STEP_MM, y: startPoint.y };
  }

  if (snappedAngle === 90 || snappedAngle === 270) {
    const ySteps = Math.max(1, Math.round(Math.abs(dy) / GRID_STEP_MM));
    return { x: startPoint.x, y: startPoint.y + verticalSign * ySteps * GRID_STEP_MM };
  }

  const diagonalSteps = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / GRID_STEP_MM));
  return {
    x: startPoint.x + horizontalSign * diagonalSteps * GRID_STEP_MM,
    y: startPoint.y + verticalSign * diagonalSteps * GRID_STEP_MM,
  };
};

const createLineEntity = (startPoint: Point, endPoint: Point, entityType: CanvasV4LineEntity['entityType'], polylineId?: string): CanvasV4LineEntity => {
  const metrics = getLineMetrics(startPoint, endPoint);
  const lineId = `line-${Date.now()}-${Math.round(Math.random() * 100000)}`;

  return {
    entityId: lineId,
    lineId,
    entityType,
    polylineId,
    startPoint,
    endPoint,
    length: metrics.length,
    angle: metrics.angle,
  };
};

const getDistanceToSegment = (point: Point, startPoint: Point, endPoint: Point) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const segmentLengthSq = dx * dx + dy * dy;

  if (segmentLengthSq === 0) {
    return Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - startPoint.x) * dx + (point.y - startPoint.y) * dy) / segmentLengthSq));
  const projection = {
    x: startPoint.x + t * dx,
    y: startPoint.y + t * dy,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
};

const getScreenPoint = (nativeEvent: any): Point => ({
  x: nativeEvent.locationX ?? nativeEvent.offsetX ?? 0,
  y: nativeEvent.locationY ?? nativeEvent.offsetY ?? 0,
});

export const CanvasV4DevScreen = () => {
  const canvasRef = useRef<View | null>(null);
  const dragSessionRef = useRef<DragSession>(EMPTY_DRAG_SESSION);
  const { height: windowHeight } = useWindowDimensions();

  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const [cameraZoom, setCameraZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isGridVisible, setGridVisible] = useState(true);
  const [isInspectorVisible, setInspectorVisible] = useState(true);
  const [currentToolMode, setCurrentToolMode] = useState<ToolMode>('idle');
  const [entities, setEntities] = useState<CanvasV4LineEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [lineStartPoint, setLineStartPoint] = useState<Point | null>(null);
  const [polylineLastPoint, setPolylineLastPoint] = useState<Point | null>(null);
  const [activePolylineId, setActivePolylineId] = useState<string | null>(null);
  const [pointerWorldPoint, setPointerWorldPoint] = useState<Point | null>(null);
  const [lastActionType, setLastActionType] = useState<string>('INIT_CANVAS_V4');
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  const worldToScreen = useCallback(
    (point: Point): Point => ({
      x: point.x * cameraZoom + viewport.width / 2 + pan.x,
      y: point.y * cameraZoom + viewport.height / 2 + pan.y,
    }),
    [cameraZoom, pan.x, pan.y, viewport.height, viewport.width],
  );

  const screenToWorld = useCallback(
    (point: Point): Point => ({
      x: (point.x - viewport.width / 2 - pan.x) / cameraZoom,
      y: (point.y - viewport.height / 2 - pan.y) / cameraZoom,
    }),
    [cameraZoom, pan.x, pan.y, viewport.height, viewport.width],
  );

  const previewLine = useMemo(() => {
    const startPoint = currentToolMode === 'line' ? lineStartPoint : currentToolMode === 'polyline' ? polylineLastPoint : null;

    if (!startPoint || !pointerWorldPoint) {
      return null;
    }

    const endPoint = snapEndPoint(startPoint, pointerWorldPoint);
    const metrics = getLineMetrics(startPoint, endPoint);

    return {
      startPoint,
      endPoint,
      length: metrics.length,
      angle: metrics.angle,
    };
  }, [currentToolMode, lineStartPoint, pointerWorldPoint, polylineLastPoint]);

  const getLineScreenGeometry = useCallback(
    (startPoint: Point, endPoint: Point) => {
      const screenStart = worldToScreen(startPoint);
      const screenEnd = worldToScreen(endPoint);
      const length = Math.hypot(screenEnd.x - screenStart.x, screenEnd.y - screenStart.y);
      const centerX = (screenStart.x + screenEnd.x) / 2;
      const centerY = (screenStart.y + screenEnd.y) / 2;
      const angleDeg = (Math.atan2(screenEnd.y - screenStart.y, screenEnd.x - screenStart.x) * 180) / Math.PI;

      return { length, centerX, centerY, angleDeg };
    },
    [worldToScreen],
  );

  const gridLines = useMemo(() => {
    if (!isGridVisible || viewport.width <= 1 || viewport.height <= 1) {
      return [];
    }

    const topLeft = screenToWorld({ x: 0, y: 0 });
    const bottomRight = screenToWorld({ x: viewport.width, y: viewport.height });
    const minX = Math.floor(Math.min(topLeft.x, bottomRight.x) / GRID_STEP_MM) * GRID_STEP_MM;
    const maxX = Math.ceil(Math.max(topLeft.x, bottomRight.x) / GRID_STEP_MM) * GRID_STEP_MM;
    const minY = Math.floor(Math.min(topLeft.y, bottomRight.y) / GRID_STEP_MM) * GRID_STEP_MM;
    const maxY = Math.ceil(Math.max(topLeft.y, bottomRight.y) / GRID_STEP_MM) * GRID_STEP_MM;
    const lines: Array<{ id: string; axis: 'x' | 'y'; position: number; isMajor: boolean }> = [];

    for (let x = minX; x <= maxX; x += GRID_STEP_MM) {
      lines.push({ id: `v-${x}`, axis: 'y', position: worldToScreen({ x, y: 0 }).x, isMajor: x % 1000 === 0 });
    }

    for (let y = minY; y <= maxY; y += GRID_STEP_MM) {
      lines.push({ id: `h-${y}`, axis: 'x', position: worldToScreen({ x: 0, y }).y, isMajor: y % 1000 === 0 });
    }

    return lines;
  }, [isGridVisible, screenToWorld, viewport.height, viewport.width, worldToScreen]);

  const pushUndo = useCallback((action: UndoAction) => {
    setUndoAction(action);
    setLastActionType(action.type);
  }, []);

  const findEntityAtWorldPoint = useCallback(
    (worldPoint: Point) => {
      const tolerance = HIT_TOLERANCE_PX / cameraZoom;

      return [...entities]
        .reverse()
        .find((entity) => getDistanceToSegment(worldPoint, entity.startPoint, entity.endPoint) <= tolerance)?.entityId ?? null;
    },
    [cameraZoom, entities],
  );

  const applyZoom = useCallback((factor: number) => {
    setCameraZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current * factor)));
    setLastActionType('ZOOM_CHANGE');
  }, []);

  const resetView = useCallback(() => {
    setCameraZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
    setLastActionType('RESET_VIEW');
  }, []);

  const deleteSelectedEntity = useCallback(() => {
    if (!selectedEntityId) {
      return;
    }

    setEntities((current) => {
      const index = current.findIndex((entity) => entity.entityId === selectedEntityId);

      if (index === -1) {
        return current;
      }

      const entity = current[index];
      setUndoAction({ type: 'DELETE_ENTITY', entity, index });
      setLastActionType('DELETE_ENTITY');
      return current.filter((item) => item.entityId !== selectedEntityId);
    });
    setSelectedEntityId(null);
  }, [selectedEntityId]);

  const undoLastAction = useCallback(() => {
    if (!undoAction) {
      return;
    }

    if (undoAction.type === 'CREATE_LINE' || undoAction.type === 'CREATE_POLYLINE_SEGMENT') {
      setEntities((current) => current.filter((entity) => entity.entityId !== undoAction.entityId));
      setSelectedEntityId(null);
    }

    if (undoAction.type === 'DELETE_ENTITY') {
      setEntities((current) => {
        const next = [...current];
        next.splice(Math.min(undoAction.index, next.length), 0, undoAction.entity);
        return next;
      });
      setSelectedEntityId(undoAction.entity.entityId);
    }

    setUndoAction(null);
    setLastActionType(`UNDO_${undoAction.type}`);
  }, [undoAction]);

  const finishClick = useCallback(
    (screenPoint: Point) => {
      const snappedWorldPoint = snapPointToGrid(screenToWorld(screenPoint));
      setPointerWorldPoint(snappedWorldPoint);

      if (currentToolMode === 'line') {
        if (!lineStartPoint) {
          setLineStartPoint(snappedWorldPoint);
          setSelectedEntityId(null);
          setLastActionType('SET_LINE_START');
          return;
        }

        const endPoint = snapEndPoint(lineStartPoint, snappedWorldPoint);
        const entity = createLineEntity(lineStartPoint, endPoint, 'line');
        setEntities((current) => [...current, entity]);
        setLineStartPoint(null);
        setSelectedEntityId(entity.entityId);
        pushUndo({ type: 'CREATE_LINE', entityId: entity.entityId });
        return;
      }

      if (currentToolMode === 'polyline') {
        if (!polylineLastPoint) {
          setPolylineLastPoint(snappedWorldPoint);
          setActivePolylineId(`polyline-${Date.now()}`);
          setSelectedEntityId(null);
          setLastActionType('SET_POLYLINE_START');
          return;
        }

        const endPoint = snapEndPoint(polylineLastPoint, snappedWorldPoint);
        const entity = createLineEntity(polylineLastPoint, endPoint, 'polyline-segment', activePolylineId ?? undefined);
        setEntities((current) => [...current, entity]);
        setPolylineLastPoint(endPoint);
        setSelectedEntityId(entity.entityId);
        pushUndo({ type: 'CREATE_POLYLINE_SEGMENT', entityId: entity.entityId });
        return;
      }

      if (currentToolMode === 'select') {
        const hitEntityId = findEntityAtWorldPoint(snappedWorldPoint);
        setSelectedEntityId(hitEntityId);
        setLastActionType(hitEntityId ? 'SELECT_ENTITY' : 'CLEAR_SELECTION');
        return;
      }

      setSelectedEntityId(null);
      setLastActionType('IDLE_TAP');
    },
    [activePolylineId, currentToolMode, findEntityAtWorldPoint, lineStartPoint, polylineLastPoint, pushUndo, screenToWorld],
  );

  const setToolMode = useCallback((mode: ToolMode) => {
    setCurrentToolMode(mode);
    setLineStartPoint(null);
    setPolylineLastPoint(null);
    setActivePolylineId(null);
    setPointerWorldPoint(null);
    setLastActionType(`SET_TOOL_${mode.toUpperCase()}`);
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  }, []);

  const beginInteraction = useCallback(
    (screenPoint: Point, pointerId?: number) => {
      dragSessionRef.current = {
        started: true,
        moved: false,
        pointerId: pointerId ?? null,
        startX: screenPoint.x,
        startY: screenPoint.y,
        lastX: screenPoint.x,
        lastY: screenPoint.y,
      };
      setPointerWorldPoint(snapPointToGrid(screenToWorld(screenPoint)));
    },
    [screenToWorld],
  );

  const moveInteraction = useCallback(
    (screenPoint: Point, pointerId?: number) => {
      const session = dragSessionRef.current;

      if (!session.started || (session.pointerId !== null && pointerId !== undefined && session.pointerId !== pointerId)) {
        return;
      }

      const deltaX = screenPoint.x - session.lastX;
      const deltaY = screenPoint.y - session.lastY;
      const totalDx = screenPoint.x - session.startX;
      const totalDy = screenPoint.y - session.startY;
      const moved = session.moved || Math.hypot(totalDx, totalDy) >= DRAG_THRESHOLD_PX;

      dragSessionRef.current = {
        ...session,
        moved,
        lastX: screenPoint.x,
        lastY: screenPoint.y,
      };
      setPointerWorldPoint(snapPointToGrid(screenToWorld(screenPoint)));

      if (moved) {
        setPan((current) => ({ x: current.x + deltaX, y: current.y + deltaY }));
        setLastActionType('PAN_CHANGE');
      }
    },
    [screenToWorld],
  );

  const endInteraction = useCallback(
    (screenPoint: Point, pointerId?: number) => {
      const session = dragSessionRef.current;

      if (!session.started || (session.pointerId !== null && pointerId !== undefined && session.pointerId !== pointerId)) {
        return;
      }

      setPointerWorldPoint(snapPointToGrid(screenToWorld(screenPoint)));

      if (!session.moved) {
        finishClick(screenPoint);
      }

      dragSessionRef.current = EMPTY_DRAG_SESSION;
    },
    [finishClick, screenToWorld],
  );

  const responderHandlers = useMemo(
    () => ({
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: (event: any) => beginInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderMove: (event: any) => moveInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderRelease: (event: any) => endInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderTerminate: (event: any) => endInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderTerminationRequest: () => false,
    }),
    [beginInteraction, endInteraction, moveInteraction],
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

    const onPointerMove = (event: PointerEvent) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setPointerWorldPoint(snapPointToGrid(screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top })));
    };

    canvasNode.addEventListener('wheel', onWheel, { passive: false });
    canvasNode.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      canvasNode.removeEventListener?.('wheel', onWheel);
      canvasNode.removeEventListener?.('pointermove', onPointerMove);
    };
  }, [applyZoom, screenToWorld]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedEntity();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoLastAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelectedEntity, undoLastAction]);

  const inspectorLines = useMemo(
    () => [
      `currentToolMode: ${currentToolMode}`,
      `entitiesCount: ${entities.length}`,
      `selectedEntityId: ${selectedEntityId ?? 'null'}`,
      `lastActionType: ${lastActionType}`,
      `cameraZoom: ${cameraZoom.toFixed(3)}`,
      `displayZoom: ${((cameraZoom / DEFAULT_ZOOM) * 100).toFixed(0)}%`,
      `pan: (${pan.x.toFixed(1)}, ${pan.y.toFixed(1)})`,
      `gridStepMm: ${GRID_STEP_MM}`,
      `isDrawingLine: ${lineStartPoint || polylineLastPoint ? 'true' : 'false'}`,
      `previewLineAngle: ${previewLine ? `${formatAngle(previewLine.angle).toFixed(0)}°` : 'null'}`,
      `previewLineLength: ${previewLine ? `${previewLine.length.toFixed(0)} mm` : 'null'}`,
    ],
    [cameraZoom, currentToolMode, entities.length, lastActionType, lineStartPoint, pan.x, pan.y, polylineLastPoint, previewLine, selectedEntityId],
  );

  const canvasHeight = Math.max(Math.min(windowHeight * 0.62, 720), 420);
  const previewGeometry = previewLine ? getLineScreenGeometry(previewLine.startPoint, previewLine.endPoint) : null;

  return (
    <View style={styles.root}>
      <AppHeader title="Canvas V4 Dev" />

      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        <View style={styles.controlsRow}>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_OUT_FACTOR)}>
            <Text style={styles.controlButtonText}>Зум -</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_IN_FACTOR)}>
            <Text style={styles.controlButtonText}>Зум +</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, styles.resetButton]} onPress={resetView}>
            <Text style={styles.controlButtonText}>Reset View</Text>
            <Text style={styles.controlButtonSubtext}>{((cameraZoom / DEFAULT_ZOOM) * 100).toFixed(0)}%</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, !isGridVisible ? styles.controlButtonActive : null]} onPress={() => setGridVisible((current) => !current)}>
            <Text style={styles.controlButtonText}>{isGridVisible ? 'Скрыть сетку' : 'Показать сетку'}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, isInspectorVisible ? styles.controlButtonActive : null]} onPress={() => setInspectorVisible((current) => !current)}>
            <Text style={styles.controlButtonText}>{isInspectorVisible ? 'Скрыть Inspector' : 'Inspector'}</Text>
          </Pressable>
        </View>

        <View style={styles.toolRow}>
          {(['idle', 'line', 'polyline', 'select'] as ToolMode[]).map((mode) => (
            <Pressable key={mode} style={[styles.toolButton, currentToolMode === mode ? styles.toolButtonActive : null]} onPress={() => setToolMode(mode)}>
              <Text style={[styles.toolButtonText, currentToolMode === mode ? styles.toolButtonTextActive : null]}>
                {mode === 'idle' ? 'Idle' : mode === 'line' ? 'Линия' : mode === 'polyline' ? 'Полилиния' : 'Выбор'}
              </Text>
            </Pressable>
          ))}
          <Pressable style={[styles.toolButton, selectedEntityId ? styles.dangerButton : styles.toolButtonDisabled]} onPress={deleteSelectedEntity} disabled={!selectedEntityId}>
            <Text style={[styles.toolButtonText, selectedEntityId ? styles.dangerButtonText : styles.toolButtonDisabledText]}>Удалить</Text>
          </Pressable>
          <Pressable style={[styles.toolButton, undoAction ? styles.undoButton : styles.toolButtonDisabled]} onPress={undoLastAction} disabled={!undoAction}>
            <Text style={[styles.toolButtonText, undoAction ? styles.undoButtonText : styles.toolButtonDisabledText]}>Undo</Text>
          </Pressable>
        </View>

        <View style={styles.canvasShell}>
          <View ref={canvasRef} style={[styles.canvasArea, { height: canvasHeight }]} onLayout={onLayout} {...responderHandlers}>
            {gridLines.map((line) => (
              <View
                key={line.id}
                pointerEvents="none"
                style={[
                  line.isMajor ? styles.gridLineMajor : styles.gridLine,
                  line.axis === 'y'
                    ? { left: line.position, top: 0, width: 1, height: viewport.height }
                    : { top: line.position, left: 0, height: 1, width: viewport.width },
                ]}
              />
            ))}

            <View pointerEvents="none" style={[styles.axisLine, { left: worldToScreen({ x: 0, y: 0 }).x, top: 0, height: viewport.height, width: 1 }]} />
            <View pointerEvents="none" style={[styles.axisLine, { top: worldToScreen({ x: 0, y: 0 }).y, left: 0, width: viewport.width, height: 1 }]} />

            {entities.map((entity) => {
              const geometry = getLineScreenGeometry(entity.startPoint, entity.endPoint);
              const isSelected = selectedEntityId === entity.entityId;

              return (
                <View
                  key={entity.entityId}
                  pointerEvents="none"
                  style={[
                    styles.lineEntity,
                    entity.entityType === 'polyline-segment' ? styles.polylineSegment : null,
                    isSelected ? styles.lineEntitySelected : null,
                    {
                      width: Math.max(geometry.length, 1),
                      left: geometry.centerX - geometry.length / 2,
                      top: geometry.centerY - (isSelected ? 2 : 1),
                      transform: [{ rotate: `${geometry.angleDeg}deg` }],
                    },
                  ]}
                />
              );
            })}

            {previewLine && previewGeometry ? (
              <View
                pointerEvents="none"
                style={[
                  styles.previewLine,
                  {
                    width: Math.max(previewGeometry.length, 1),
                    left: previewGeometry.centerX - previewGeometry.length / 2,
                    top: previewGeometry.centerY - 1,
                    transform: [{ rotate: `${previewGeometry.angleDeg}deg` }],
                  },
                ]}
              />
            ) : null}

            {lineStartPoint ? <View pointerEvents="none" style={[styles.anchorPoint, { left: worldToScreen(lineStartPoint).x - 5, top: worldToScreen(lineStartPoint).y - 5 }]} /> : null}
            {polylineLastPoint ? <View pointerEvents="none" style={[styles.anchorPoint, styles.polylineAnchor, { left: worldToScreen(polylineLastPoint).x - 5, top: worldToScreen(polylineLastPoint).y - 5 }]} /> : null}

            {isInspectorVisible ? (
              <View style={styles.inspectorPanel} pointerEvents="box-none">
                <Text style={styles.inspectorTitle}>Dev Inspector</Text>
                {inspectorLines.map((line) => (
                  <Text key={line} style={styles.inspectorLine}>{line}</Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.metaPanel}>
          <Text style={styles.metaTitle}>Canvas V4 CAD-lite sandbox</Text>
          <Text style={styles.metaText}>Чистая dev-сцена без Room Engine, Surface Scene, split, wall graph и SmetMaster logic. ЛКМ/тап — действие инструмента, drag — pan, wheel/кнопки — zoom.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF3FA',
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    padding: 16,
    gap: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  controlButtonText: {
    color: '#0F172A',
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
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E0EF',
  },
  toolButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#2563EB',
  },
  toolButtonText: {
    color: '#334155',
    fontWeight: '800',
  },
  toolButtonTextActive: {
    color: '#FFFFFF',
  },
  dangerButton: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
  },
  dangerButtonText: {
    color: '#B91C1C',
  },
  undoButton: {
    borderColor: '#93C5FD',
    backgroundColor: '#DBEAFE',
  },
  undoButtonText: {
    color: '#1D4ED8',
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  toolButtonDisabledText: {
    color: '#94A3B8',
  },
  canvasShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#FFFFFF',
    padding: 10,
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
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
  },
  gridLineMajor: {
    position: 'absolute',
    backgroundColor: 'rgba(100, 116, 139, 0.34)',
  },
  axisLine: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  lineEntity: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#0F172A',
  },
  polylineSegment: {
    backgroundColor: '#0369A1',
  },
  lineEntitySelected: {
    height: 4,
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  previewLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    opacity: 0.72,
    borderStyle: 'dashed',
  },
  anchorPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  polylineAnchor: {
    backgroundColor: '#0EA5E9',
  },
  inspectorPanel: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 280,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  inspectorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  inspectorLine: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaPanel: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E0EF',
  },
  metaTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  metaText: {
    color: '#475569',
    lineHeight: 20,
  },
});
