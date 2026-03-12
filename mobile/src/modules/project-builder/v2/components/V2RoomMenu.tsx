import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { formatRoomSize, parseRoomSizeToMm, RoomSizeUnit } from '../utils/roomUnits';

type Props = {
  roomId: string;
  room: RoomV2;
  onRenamePreset: (roomId: string, name: string) => void;
  onCustomRename: (roomId: string) => void;
  onOpenSettings: (roomId: string) => void;
  onOpenRoom: (roomId: string) => void;
  onToggleSizeLock: (roomId: string, locked: boolean) => void;
  onAddDoor: (roomId: string) => void;
  onAddWindow: (roomId: string) => void;
  onUpdateRoomSize: (roomId: string, widthMm: number, heightMm: number) => void;
};

export const V2RoomMenu = ({
  roomId,
  room,
  onRenamePreset,
  onCustomRename,
  onOpenSettings,
  onOpenRoom,
  onToggleSizeLock,
  onAddDoor,
  onAddWindow,
  onUpdateRoomSize,
}: Props) => {
  const [submenu, setSubmenu] = useState<'root' | 'name' | 'settings'>('root');
  const [sizeUnit, setSizeUnit] = useState<RoomSizeUnit>('m');
  const [editingField, setEditingField] = useState<'width' | 'height' | null>(null);
  const [draftValue, setDraftValue] = useState('');

  useEffect(() => {
    setSubmenu('root');
    setEditingField(null);
    setDraftValue('');
  }, [roomId]);

  const startEditField = (field: 'width' | 'height') => {
    setEditingField(field);

    const currentValue = field === 'width' ? formatRoomSize(room.widthMm, sizeUnit) : formatRoomSize(room.heightMm, sizeUnit);
    setDraftValue(currentValue);
  };

  const commitField = () => {
    if (!editingField) return;

    const parsedMm = parseRoomSizeToMm(draftValue, sizeUnit);
    if (parsedMm == null) {
      setEditingField(null);
      setDraftValue('');
      return;
    }

    if (editingField === 'width') {
      onUpdateRoomSize(room.id, parsedMm, room.heightMm);
    }

    if (editingField === 'height') {
      onUpdateRoomSize(room.id, room.widthMm, parsedMm);
    }

    setEditingField(null);
    setDraftValue('');
  };

  const renderRootMenu = () => (
    <>
      <Pressable style={styles.item} onPress={() => { onOpenSettings(roomId); setSubmenu('settings'); }}>
        <Text style={styles.itemText}>Настроить комнату</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => setSubmenu('name')}>
        <Text style={styles.itemText}>Имя комнаты</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onOpenRoom(roomId)}>
        <Text style={styles.itemText}>Открыть комнату</Text>
      </Pressable>
    </>
  );

  const renderNameMenu = () => (
    <>
      <Pressable style={styles.item} onPress={() => setSubmenu('root')}>
        <Text style={styles.itemText}>← Назад</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onRenamePreset(roomId, 'Кухня')}>
        <Text style={styles.itemText}>Кухня</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onRenamePreset(roomId, 'Спальня')}>
        <Text style={styles.itemText}>Спальня</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onRenamePreset(roomId, 'Зал')}>
        <Text style={styles.itemText}>Зал</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onRenamePreset(roomId, 'Прихожая')}>
        <Text style={styles.itemText}>Прихожая</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onRenamePreset(roomId, 'Холл')}>
        <Text style={styles.itemText}>Холл</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onCustomRename(roomId)}>
        <Text style={styles.itemText}>Ввести своё название</Text>
      </Pressable>
    </>
  );

  const renderSettingsMenu = () => (
    <>
      <Pressable style={styles.item} onPress={() => setSubmenu('root')}>
        <Text style={styles.itemText}>← Назад</Text>
      </Pressable>

      <View style={styles.unitRow}>
        {(['mm', 'cm', 'm'] as RoomSizeUnit[]).map((unit) => (
          <Pressable key={unit} style={[styles.unitChip, sizeUnit === unit ? styles.unitChipActive : null]} onPress={() => setSizeUnit(unit)}>
            <Text style={[styles.unitChipText, sizeUnit === unit ? styles.unitChipTextActive : null]}>{unit}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Ширина</Text>

        {editingField === 'width' ? (
          <View style={styles.inlineEditor}>
            <TextInput
              value={draftValue}
              onChangeText={setDraftValue}
              autoFocus
              keyboardType="numeric"
              style={styles.fieldInput}
              onSubmitEditing={commitField}
              onBlur={commitField}
            />
            <Pressable style={styles.confirmButton} onPress={commitField}>
              <Text style={styles.confirmButtonText}>✓</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.valueBox} onPress={() => startEditField('width')}>
            <Text style={styles.valueBoxText}>{formatRoomSize(room.widthMm, sizeUnit)}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Длина</Text>

        {editingField === 'height' ? (
          <View style={styles.inlineEditor}>
            <TextInput
              value={draftValue}
              onChangeText={setDraftValue}
              autoFocus
              keyboardType="numeric"
              style={styles.fieldInput}
              onSubmitEditing={commitField}
              onBlur={commitField}
            />
            <Pressable style={styles.confirmButton} onPress={commitField}>
              <Text style={styles.confirmButtonText}>✓</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.valueBox} onPress={() => startEditField('height')}>
            <Text style={styles.valueBoxText}>{formatRoomSize(room.heightMm, sizeUnit)}</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.item} onPress={() => onToggleSizeLock(roomId, !room.isSizeLocked)}>
        <Text style={styles.itemText}>{room.isSizeLocked ? '☑ Зафиксировать размеры' : '☐ Зафиксировать размеры'}</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onAddDoor(roomId)}>
        <Text style={styles.itemText}>Добавить дверь</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onAddWindow(roomId)}>
        <Text style={styles.itemText}>Добавить окно</Text>
      </Pressable>
    </>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {submenu === 'root' ? renderRootMenu() : null}
        {submenu === 'name' ? renderNameMenu() : null}
        {submenu === 'settings' ? renderSettingsMenu() : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 28,
    alignSelf: 'center',
    minWidth: 160,
    maxWidth: 240,
    maxHeight: 280,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    zIndex: 30,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  scroll: {
    maxHeight: 280,
  },
  scrollContent: {
    padding: 6,
    gap: 4,
  },
  item: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  itemText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '600',
  },
  unitRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  unitChipActive: {
    backgroundColor: '#2D5ED2',
    borderColor: '#2D5ED2',
  },
  unitChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '600',
  },
  valueBox: {
    minWidth: 84,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  valueBoxText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldInput: {
    minWidth: 84,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D5ED2',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D5ED2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
