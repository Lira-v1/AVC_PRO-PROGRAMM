import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ElementParametersSheet } from '../components/ElementParametersSheet';
import { ElementQuickCard } from '../components/ElementQuickCard';
import { ProjectCanvas } from '../components/ProjectCanvas';
import { ProjectCard } from '../components/ProjectCard';
import { RoomFocusHeader } from '../components/RoomFocusHeader';
import { SummaryPanel } from '../components/SummaryPanel';
import { Toolbar } from '../components/Toolbar';
import { useProjectBuilder } from '../hooks/useProjectBuilder';
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

export const SmetMasterProjectBuilderScreen = ({ navigation }: Props) => {
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

  return (
    <View style={styles.root}>
      <View style={styles.topPanel}>
        <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
          <Text style={styles.outlineButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Project Builder</Text>
        <Pressable style={styles.filledButton} onPress={saveProject}>
          <Text style={styles.filledButtonText}>Save</Text>
        </Pressable>
      </View>

      {isRoomFocusMode && selectedRoom ? <RoomFocusHeader roomName={selectedRoom.name} onBack={exitRoomFocus} /> : null}

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
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20 },
  topPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#101623' },
  outlineButton: { borderWidth: 1, borderColor: '#BBC5DC', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 66, alignItems: 'center' },
  outlineButtonText: { color: '#2A3756', fontSize: 14, fontWeight: '600' },
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
});
