import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../../components/AppHeader';
import { ElementParametersSheet } from '../components/ElementParametersSheet';
import { ElementQuickCard } from '../components/ElementQuickCard';
import { CeilingView } from '../components/CeilingView';
import { FloorView } from '../components/FloorView';
import { ProjectCanvas } from '../components/ProjectCanvas';
import { ProjectCard } from '../components/ProjectCard';
import { RoomFocusHeader } from '../components/RoomFocusHeader';
import { RoomModeSwitch } from '../components/RoomModeSwitch';
import { RoomWallsTabs } from '../components/RoomWallsTabs';
import { SummaryPanel } from '../components/SummaryPanel';
import { Toolbar } from '../components/Toolbar';
import { WallView } from '../components/WallView';
import { useProjectBuilder } from '../hooks/useProjectBuilder';
import { WALL_DIRECTION_LABELS } from '../model/orientation';
import { ROOM_VIEW_MODE_LABELS } from '../model/roomViewMode';
import { ROOM_TYPES, ROOM_TYPE_LABELS } from '../types';
import { V2Canvas } from '../v2/components/V2Canvas';
import { useCanvasUiStateV2 } from '../v2/hooks/useCanvasUiStateV2';
import { useProjectBuilderV2 } from '../v2/hooks/useProjectBuilderV2';
import { useCanvasViewportV2 } from '../v2/hooks/useCanvasViewportV2';
import { InputModeV2 } from '../v2/model/types';

type MainStackParamList = {
  Home: undefined;
  Services: undefined;
  Emergency: undefined;
  Estimate: undefined;
  Commercial: undefined;
  Maintenance: undefined;
  Vacancies: undefined;
  Orders: undefined;
  Shop: undefined;
  CreateRequest: undefined;
  Login: undefined;
  Registration: undefined;
  Placeholder: { title: string };
  ChatMaster: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, 'Estimate'>;

export const SmetMasterProjectBuilderScreen = ({}: Props) => {
  const [mode, setMode] = useState<'home' | 'intake' | 'project' | 'project_v2'>('home');
  const [input, setInput] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isProjectV2ToolsOpen, setIsProjectV2ToolsOpen] = useState(false);
  const [inputModeV2, setInputModeV2] = useState<InputModeV2>({ type: 'default' });
  const {
    project,
    rooms,
    displayedRooms,
    displayedElements,
    selectedRoom,
    selectedElement,
    selectedRoomId,
    selectedElementId,
    isRoomFocusMode,
    roomViewMode,
    selectedWallId,
    selectedRoomWalls,
    selectedWall,
    isSummaryOpen,
    lastSavedAt,
    isQuickCardOpen,
    isParametersSheetOpen,
    tool,
    setTool,
    addRoom,
    selectRoom,
    enterRoomFocus,
    exitRoomFocus,
    switchRoomViewMode,
    selectWall,
    openSummary,
    closeSummary,
    moveRoom,
    resizeRoom,
    setRoomType,
    setRoomDimensions,
    removeRoom,
    selectElement,
    moveElement,
    deleteElement,
    duplicateElement,
    updateElementParameters,
    openParametersSheet,
    closeParametersSheet,
    closeElementPanels,
    handleCanvasTap,
    saveProject,
    prepareEstimateDraft,
  } = useProjectBuilder();
  const {
    rooms: v2Rooms,
    selectedRoomId: v2SelectedRoomId,
    orientation: v2Orientation,
    selectRoom: selectV2Room,
    deselectRoom: deselectV2Room,
    moveRoom: moveV2Room,
    resizeRoom: resizeV2Room,
    renameRoom: renameV2Room,
    rotateRoom: rotateV2Room,
    toggleCompassOrientation: toggleV2CompassOrientation,
  } = useProjectBuilderV2();
  const {
    canvasUiState,
    toggleFullscreen: toggleV2Fullscreen,
    toggleGrid: toggleV2Grid,
  } = useCanvasUiStateV2();
  const v2Viewport = useCanvasViewportV2();

  const handleDimensionChange = (field: 'width' | 'height', value: string) => {
    if (!selectedRoom) return;

    const parsedValue = Number(value.replace(',', '.'));
    if (Number.isNaN(parsedValue)) return;

    setRoomDimensions(selectedRoom.id, {
      width: field === 'width' ? parsedValue : selectedRoom.width,
      height: field === 'height' ? parsedValue : selectedRoom.height,
    });
  };

  const selectedElementRoom = selectedElement ? rooms.find((room) => room.id === selectedElement.roomId) ?? null : null;
  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const isV2RenameMode = inputModeV2.type === 'rename-room';

  const handleV2RenamePreset = (roomId: string, name: string) => {
    renameV2Room(roomId, name);
    setInputModeV2({ type: 'default' });
    setInput('');
  };

  const handleV2CustomRename = (roomId: string) => {
    setInputModeV2({ type: 'rename-room', roomId });
    const room = v2Rooms.find((item) => item.id === roomId);
    setInput(room?.name ?? '');
  };

  const handleV2OpenRoomSettings = (roomId: string) => {
    selectV2Room(roomId);
  };

  const openRoomPlaceholder = (roomId: string) => {
    console.log('Открыть комнату placeholder:', roomId);
  };

  const handleBottomInputSubmit = () => {
    if (mode === 'project_v2' && inputModeV2.type === 'rename-room') {
      renameV2Room(inputModeV2.roomId, input);
      setInputModeV2({ type: 'default' });
      setInput('');
      return;
    }

    setInput('');
  };

  const renderProjectCanvas = () => {
    if (!isRoomFocusMode || roomViewMode === 'plan') {
      return (
        <View style={styles.canvasContainer}>
          <ProjectCanvas
            rooms={displayedRooms}
            elements={displayedElements}
            selectedRoomId={selectedRoomId}
            selectedElementId={selectedElementId}
            tool={tool}
            onSelectRoom={selectRoom}
            onOpenRoom={enterRoomFocus}
            onMoveRoom={moveRoom}
            onResizeRoom={resizeRoom}
            onCanvasTap={handleCanvasTap}
            onSelectElement={selectElement}
            onDeleteElement={deleteElement}
            onMoveElement={moveElement}
          />
        </View>
      );
    }

    if (selectedRoom && roomViewMode === 'walls') {
      return (
        <View style={styles.wallModeContainer}>
          <RoomWallsTabs walls={selectedRoomWalls} selectedWallId={selectedWallId} onSelect={selectWall} />
          {selectedWall ? (
            <WallView
              roomName={selectedRoom.name}
              roomId={selectedRoom.id}
              wall={selectedWall}
              elements={displayedElements}
              selectedElementId={selectedElementId}
              onSelectElement={selectElement}
              onMoveElement={moveElement}
            />
          ) : null}
        </View>
      );
    }

    if (selectedRoom && roomViewMode === 'ceiling') {
      return (
        <View style={styles.wallModeContainer}>
          <CeilingView room={selectedRoom} orientation={project.orientation} />
        </View>
      );
    }

    if (selectedRoom && roomViewMode === 'floor') {
      return (
        <View style={styles.wallModeContainer}>
          <FloorView room={selectedRoom} orientation={project.orientation} />
        </View>
      );
    }

    return null;
  };

  const renderRoomEditorCard = () => {
    if (!selectedRoom) return null;

    return (
      <View style={styles.editorCard}>
        <Text style={styles.editorTitle}>Редактирование комнаты</Text>
        <Text style={styles.editorMeta}>id: {selectedRoom.id}</Text>
        <Text style={styles.editorMeta}>
          debug: x={Math.round(selectedRoom.x * 100) / 100}, y={Math.round(selectedRoom.y * 100) / 100}, width={Math.round(selectedRoom.width * 100) / 100}, height={Math.round(selectedRoom.height * 100) / 100}
        </Text>

        <View style={styles.typeGrid}>
          {ROOM_TYPES.map((type) => {
            const isActive = selectedRoom.type === type;
            return (
              <Pressable key={type} style={[styles.typeButton, isActive ? styles.typeButtonActive : null]} onPress={() => setRoomType(selectedRoom.id, type)}>
                <Text style={[styles.typeButtonText, isActive ? styles.typeButtonTextActive : null]}>{ROOM_TYPE_LABELS[type]}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dimensionsRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>width (m)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(Math.round(selectedRoom.width * 100) / 100)}
              onChangeText={(value) => handleDimensionChange('width', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>height (m)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(Math.round(selectedRoom.height * 100) / 100)}
              onChangeText={(value) => handleDimensionChange('height', value)}
            />
          </View>
        </View>

        <Pressable style={styles.deleteButton} onPress={() => removeRoom(selectedRoom.id)}>
          <Text style={styles.deleteButtonText}>Удалить комнату</Text>
        </Pressable>
      </View>
    );
  };

  const renderMainContent = () => {
    if (mode === 'home') {
      return (
        <View style={styles.homeContainer}>
          <Text style={styles.homeTitle}>Чем я могу вам помочь?</Text>
          <View style={styles.homeActions}>
            <Pressable style={styles.primaryActionButton} onPress={() => setMode('intake')}>
              <Text style={styles.primaryActionButtonText}>Создать смету</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryActionButton, styles.secondaryActionButton]}
              onPress={() => {
                setMode('project');
                setIsToolsOpen(false);
                setIsProjectV2ToolsOpen(false);
              }}
            >
              <Text style={[styles.primaryActionButtonText, styles.secondaryActionButtonText]}>Создать проект</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryActionButton, styles.secondaryActionButton]}
              onPress={() => {
                setMode('project_v2');
                setIsProjectV2ToolsOpen(false);
              }}
            >
              <Text style={[styles.primaryActionButtonText, styles.secondaryActionButtonText]}>Создать проект V2</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (mode === 'intake') {
      return (
        <View style={styles.homeContainer}>
          <Text style={styles.homeTitle}>Подготовка данных для сметы</Text>
        </View>
      );
    }

    if (mode === 'project_v2') {
      return (
        <View style={[styles.projectModeRoot, canvasUiState.isFullscreen ? styles.v2FullscreenRoot : null]}>
          {!canvasUiState.isFullscreen ? (
            <View style={styles.projectTopPanel}>
              <View>
                <Text style={styles.headerTitle}>Project Builder V2</Text>
                <Text style={styles.v2Subtitle}>Новый чистый визуальный редактор. Логика будет подключаться поэтапно.</Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.v2CanvasContainer, canvasUiState.isFullscreen ? styles.v2CanvasContainerFullscreen : null]}>
            <V2Canvas
              rooms={v2Rooms}
              selectedRoomId={v2SelectedRoomId}
              onSelectRoom={selectV2Room}
              onMoveRoom={moveV2Room}
              onResizeRoom={resizeV2Room}
              onRotateRoom={rotateV2Room}
              onBackgroundPress={() => {
                deselectV2Room();
                setInputModeV2({ type: 'default' });
              }}
              onRenamePreset={handleV2RenamePreset}
              onCustomRename={handleV2CustomRename}
              onOpenSettings={handleV2OpenRoomSettings}
              onOpenRoom={openRoomPlaceholder}
              showGrid={canvasUiState.showGrid}
              showCompass={canvasUiState.showCompass}
              compassViewMode={v2Orientation.viewMode}
              isFullscreen={canvasUiState.isFullscreen}
              scale={v2Viewport.scale}
              offsetX={v2Viewport.offsetX}
              offsetY={v2Viewport.offsetY}
              onToggleGrid={toggleV2Grid}
              onToggleFullscreen={toggleV2Fullscreen}
              onZoomIn={v2Viewport.zoomIn}
              onZoomOut={v2Viewport.zoomOut}
              onResetZoom={v2Viewport.resetViewport}
              onOpenTools={() => setIsProjectV2ToolsOpen(true)}
              onToggleCompassOrientation={toggleV2CompassOrientation}
            />
          </View>

          {isProjectV2ToolsOpen ? (
            <View style={styles.toolsDrawer}>
              <View style={styles.drawerHeader}>
                <Text style={styles.toolsTitle}>Инструменты V2</Text>
                <Pressable style={styles.drawerCloseButton} onPress={() => setIsProjectV2ToolsOpen(false)}>
                  <Text style={styles.drawerCloseText}>Скрыть</Text>
                </Pressable>
              </View>

              <Text style={styles.toolsDescription}>Здесь будет новая система инструментов редактора</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.projectModeRoot}>
        <View style={styles.projectTopPanel}>
          <Text style={styles.headerTitle}>Project Builder</Text>
          <View style={styles.projectTopActions}>
            <Pressable style={styles.secondaryButton} onPress={openSummary}>
              <Text style={styles.secondaryButtonText}>Сводка</Text>
            </Pressable>
            <Pressable style={styles.filledButton} onPress={saveProject}>
              <Text style={styles.filledButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>

        {isRoomFocusMode && selectedRoom ? (
          <RoomFocusHeader
            roomName={selectedRoom.name}
            onBack={exitRoomFocus}
            breadcrumb={
              selectedWall && roomViewMode === 'walls'
                ? `Проект → ${selectedRoom.name} → Стены → ${WALL_DIRECTION_LABELS[selectedWall.cardinal]}`
                : `Проект → ${selectedRoom.name} → ${ROOM_VIEW_MODE_LABELS[roomViewMode]}`
            }
          />
        ) : null}

        <View style={styles.toolbarHeader}>
          <Text style={styles.projectTitle}>{project.name}</Text>
          <View style={styles.headerActionsCompact}>
            {selectedRoom && !isRoomFocusMode ? (
              <Pressable style={styles.secondaryButton} onPress={() => enterRoomFocus(selectedRoom.id)}>
                <Text style={styles.secondaryButtonText}>Открыть комнату</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.addRoomButton} onPress={addRoom}>
              <Text style={styles.addRoomButtonText}>Добавить комнату</Text>
            </Pressable>
          </View>
        </View>

        {isRoomFocusMode && selectedRoom ? <RoomModeSwitch mode={roomViewMode} onChange={switchRoomViewMode} /> : null}
        {renderProjectCanvas()}

        {selectedElement && isQuickCardOpen && !isToolsOpen ? (
          <ElementQuickCard
            element={selectedElement}
            room={selectedElementRoom}
            onOpenParameters={openParametersSheet}
            onDuplicate={() => duplicateElement(selectedElement.id)}
            onDelete={() => deleteElement(selectedElement.id)}
            onClose={closeElementPanels}
          />
        ) : null}

        {selectedElement && isParametersSheetOpen ? (
          <ElementParametersSheet
            element={selectedElement}
            isOpen={isParametersSheetOpen}
            onSave={(patch) => updateElementParameters(selectedElement.id, patch)}
            onDelete={() => deleteElement(selectedElement.id)}
            onClose={closeParametersSheet}
          />
        ) : null}

        {isToolsOpen ? (
          <View style={styles.toolsDrawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.toolsTitle}>Инструменты ProjectMaster</Text>
              <Pressable style={styles.drawerCloseButton} onPress={() => setIsToolsOpen(false)}>
                <Text style={styles.drawerCloseText}>Скрыть</Text>
              </Pressable>
            </View>

            <Text style={styles.toolsDescription}>Canvas-first режим: выберите инструмент и работайте напрямую на плане.</Text>
            <Toolbar tool={tool} onSelectTool={setTool} />

            <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerScrollContent}>
              {renderRoomEditorCard()}
              <ProjectCard
                project={project}
                lastSavedAt={lastSavedAt}
                onOpenSummary={openSummary}
                onSendToEstimate={prepareEstimateDraft}
                onSave={saveProject}
                onEdit={() => undefined}
              />
            </ScrollView>
          </View>
        ) : (
          <Pressable style={styles.gearButton} onPress={() => setIsToolsOpen(true)}>
            <Text style={styles.gearIcon}>⚙️</Text>
          </Pressable>
        )}

        <SummaryPanel project={project} isOpen={isSummaryOpen} onClose={closeSummary} />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader title="SmetMaster" />

      <View style={[styles.contentArea, mode === 'project_v2' && canvasUiState.isFullscreen ? styles.contentAreaFullscreen : null]}>{renderMainContent()}</View>

      {mode === 'project_v2' && canvasUiState.isFullscreen ? null : (
        <View style={styles.inputRow}>
          <Pressable style={styles.iconButton} onPress={() => undefined}>
            <Text style={styles.iconText}>📎</Text>
          </Pressable>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder={mode === 'project_v2' && isV2RenameMode ? 'Введите название комнаты...' : 'Напишите сообщение...'}
            placeholderTextColor="#8A94A6"
            multiline
          />
          <Pressable style={[styles.iconButton, styles.sendButton, !canSend && styles.sendButtonDisabled]} onPress={handleBottomInputSubmit}>
            <Text style={styles.sendText}>➤</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  contentArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  contentAreaFullscreen: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 },
  homeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  homeTitle: { color: '#1B2A45', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  homeActions: { width: '100%', maxWidth: 380, gap: 10 },
  primaryActionButton: { minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E5BF2' },
  primaryActionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryActionButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3F2' },
  secondaryActionButtonText: { color: '#1B2A45' },
  projectModeRoot: { flex: 1, position: 'relative' },
  v2FullscreenRoot: { paddingTop: 0 },
  projectTopPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  projectTopActions: { flexDirection: 'row', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#101623' },
  filledButton: { backgroundColor: '#3461D5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 66, alignItems: 'center' },
  filledButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  toolbarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerActionsCompact: { flexDirection: 'row', gap: 8 },
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#BBC5DC', paddingVertical: 10, paddingHorizontal: 10 },
  secondaryButtonText: { color: '#2A3756', fontSize: 12, fontWeight: '700' },
  projectTitle: { fontSize: 16, color: '#2A3756', fontWeight: '600' },
  addRoomButton: { backgroundColor: '#1E8B57', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  addRoomButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  canvasContainer: { flex: 1, marginTop: 8, marginBottom: 12, paddingRight: 64 },
  wallModeContainer: { flex: 1, marginTop: 8, marginBottom: 12, paddingRight: 64 },
  editorCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D7DEEE', padding: 12, gap: 10 },
  editorTitle: { fontSize: 16, fontWeight: '700', color: '#1C2743' },
  editorMeta: { fontSize: 12, color: '#617194' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#BBC5DC', backgroundColor: '#FFFFFF' },
  typeButtonActive: { backgroundColor: '#2D5ED2', borderColor: '#2D5ED2' },
  typeButtonText: { color: '#2A3756', fontSize: 13, fontWeight: '600' },
  typeButtonTextActive: { color: '#FFFFFF' },
  dimensionsRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1, gap: 4 },
  inputLabel: { fontSize: 12, color: '#617194' },
  input: { borderWidth: 1, borderColor: '#BBC5DC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#1C2743', backgroundColor: '#FFFFFF' },
  deleteButton: { alignSelf: 'flex-start', backgroundColor: '#D64343', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8, backgroundColor: '#F3F5FA' },
  chatInput: { flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFCFF', color: '#1B2A45' },
  iconButton: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#DCE3F2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  iconText: { fontSize: 18 },
  sendButton: { backgroundColor: '#0E5BF2', borderColor: '#0E5BF2' },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  gearButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  gearIcon: { fontSize: 20 },
  toolsDrawer: {
    position: 'absolute',
    top: 8,
    right: 0,
    bottom: 8,
    width: '34%',
    minWidth: 260,
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drawerCloseButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#BBC5DC' },
  drawerCloseText: { color: '#2A3756', fontSize: 12, fontWeight: '700' },
  toolsTitle: { color: '#1B2A45', fontSize: 15, fontWeight: '700' },
  toolsDescription: { color: '#61708D', fontSize: 13, lineHeight: 18 },
  v2Subtitle: { color: '#61708D', fontSize: 13, lineHeight: 18, marginTop: 4, maxWidth: 480 },
  v2CanvasContainer: {
    flex: 1,
    marginTop: 8,
    marginBottom: 12,
    marginRight: 64,
    gap: 8,
  },
  v2CanvasContainerFullscreen: {
    marginTop: 0,
    marginBottom: 0,
    marginRight: 0,
  },
  drawerScroll: { flex: 1 },
  drawerScrollContent: { gap: 10, paddingBottom: 6 },
});
