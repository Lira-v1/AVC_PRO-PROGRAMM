import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [mode, setMode] = useState<'home' | 'intake' | 'project'>('home');
  const [input, setInput] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
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
                setIsToolsOpen(true);
              }}
            >
              <Text style={[styles.primaryActionButtonText, styles.secondaryActionButtonText]}>Создать проект</Text>
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

    return (
      <>
        <View style={styles.projectTopPanel}>
          <Text style={styles.headerTitle}>Project Builder</Text>
          <Pressable style={styles.filledButton} onPress={saveProject}>
            <Text style={styles.filledButtonText}>Save</Text>
          </Pressable>
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
          <View style={styles.headerActions}>
            {selectedRoom && !isRoomFocusMode ? (
              <Pressable style={styles.secondaryButton} onPress={() => enterRoomFocus(selectedRoom.id)}>
                <Text style={styles.secondaryButtonText}>Открыть комнату</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondaryButton} onPress={openSummary}>
              <Text style={styles.secondaryButtonText}>Сводка</Text>
            </Pressable>
            <Pressable style={styles.addRoomButton} onPress={addRoom}>
              <Text style={styles.addRoomButtonText}>Добавить комнату</Text>
            </Pressable>
          </View>
        </View>

        <Toolbar tool={tool} onSelectTool={setTool} />

        {isRoomFocusMode && selectedRoom ? <RoomModeSwitch mode={roomViewMode} onChange={switchRoomViewMode} /> : null}

        {!isRoomFocusMode || roomViewMode === 'plan' ? (
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
        ) : null}

        {isRoomFocusMode && selectedRoom && roomViewMode === 'walls' ? (
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
        ) : null}

        {isRoomFocusMode && selectedRoom && roomViewMode === 'ceiling' ? (
          <View style={styles.wallModeContainer}>
            <CeilingView room={selectedRoom} orientation={project.orientation} />
          </View>
        ) : null}

        {isRoomFocusMode && selectedRoom && roomViewMode === 'floor' ? (
          <View style={styles.wallModeContainer}>
            <FloorView room={selectedRoom} orientation={project.orientation} />
          </View>
        ) : null}

        {selectedElement && isQuickCardOpen ? (
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

        {selectedRoom ? (
          <View style={styles.editorCard}>
            <Text style={styles.editorTitle}>Редактирование комнаты</Text>
            <Text style={styles.editorMeta}>id: {selectedRoom.id}</Text>

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
        ) : null}

        <ProjectCard
          project={project}
          lastSavedAt={lastSavedAt}
          onOpenSummary={openSummary}
          onSendToEstimate={prepareEstimateDraft}
          onSave={saveProject}
          onEdit={() => undefined}
        />

        <SummaryPanel project={project} isOpen={isSummaryOpen} onClose={closeSummary} />
      </>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader title="SmetMaster" />

      <View style={styles.contentArea}>{renderMainContent()}</View>

      <View style={styles.inputRow}>
        <Pressable style={styles.iconButton} onPress={() => undefined}>
          <Text style={styles.iconText}>📎</Text>
        </Pressable>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="Напишите сообщение..."
          placeholderTextColor="#8A94A6"
          multiline
        />
        <Pressable style={[styles.iconButton, styles.sendButton, !canSend && styles.sendButtonDisabled]} onPress={() => setInput('')}>
          <Text style={styles.sendText}>➤</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.gearButton}
        onPress={() => setIsToolsOpen((value) => !value)}
      >
        <Text style={styles.gearIcon}>⚙️</Text>
      </Pressable>

      {isToolsOpen ? (
        <View style={styles.toolsDrawer}>
          <Text style={styles.toolsTitle}>{mode === 'project' ? 'Инструменты ProjectMaster' : 'Инструменты SmetMaster'}</Text>
          <Text style={styles.toolsDescription}>
            {mode === 'project'
              ? 'Панель для элементов, розеток, выключателей, светильников и инженерных элементов.'
              : 'Быстрые действия появятся здесь после выбора режима работы.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  contentArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  homeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  homeTitle: { color: '#1B2A45', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  homeActions: { width: '100%', maxWidth: 380, gap: 10 },
  primaryActionButton: { minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E5BF2' },
  primaryActionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryActionButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3F2' },
  secondaryActionButtonText: { color: '#1B2A45' },
  projectTopPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#101623' },
  filledButton: { backgroundColor: '#3461D5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 66, alignItems: 'center' },
  filledButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  toolbarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#BBC5DC', paddingVertical: 10, paddingHorizontal: 10 },
  secondaryButtonText: { color: '#2A3756', fontSize: 12, fontWeight: '700' },
  projectTitle: { fontSize: 16, color: '#2A3756', fontWeight: '600' },
  addRoomButton: { backgroundColor: '#1E8B57', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  addRoomButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  canvasContainer: { flex: 1, marginTop: 8, marginBottom: 12 },
  wallModeContainer: { marginTop: 8, marginBottom: 12 },
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
    right: 14,
    top: '48%',
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
    top: 56,
    right: 0,
    bottom: 66,
    width: '28%',
    minWidth: 220,
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#DCE3F2',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
  },
  toolsTitle: { color: '#1B2A45', fontSize: 15, fontWeight: '700' },
  toolsDescription: { color: '#61708D', fontSize: 13, lineHeight: 18 },
});
