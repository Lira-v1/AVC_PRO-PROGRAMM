import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';

type Props = {
  roomId: string;
  room: RoomV2;
  onRenamePreset: (roomId: string, name: string) => void;
  onCustomRename: (roomId: string) => void;
  onOpenSettings: (roomId: string) => void;
  onOpenRoom: (roomId: string) => void;
  onStartSetWidth: (roomId: string) => void;
  onStartSetHeight: (roomId: string) => void;
  onToggleSizeLock: (roomId: string, locked: boolean) => void;
  onAddDoor: (roomId: string) => void;
  onAddWindow: (roomId: string) => void;
};

export const V2RoomMenu = ({
  roomId,
  room,
  onRenamePreset,
  onCustomRename,
  onOpenRoom,
  onStartSetWidth,
  onStartSetHeight,
  onToggleSizeLock,
  onAddDoor,
  onAddWindow,
}: Props) => {
  const [submenu, setSubmenu] = useState<'root' | 'name' | 'settings'>('root');

  useEffect(() => {
    setSubmenu('root');
  }, [roomId]);

  if (submenu === 'settings') {
    return (
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
          <Pressable style={styles.item} onPress={() => setSubmenu('root')}>
            <Text style={styles.itemText}>← Назад</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => onStartSetWidth(roomId)}>
            <Text style={styles.itemText}>Ширина: {((room.widthCm ?? room.width) / 100).toFixed(2)} м</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => onStartSetHeight(roomId)}>
            <Text style={styles.itemText}>Длина: {((room.heightCm ?? room.height) / 100).toFixed(2)} м</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => onToggleSizeLock(roomId, !room.isSizeLocked)}>
            <Text style={styles.itemText}>{room.isSizeLocked ? '☑ Зафиксировать размеры' : '☐ Зафиксировать размеры'}</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => onAddDoor(roomId)}>
            <Text style={styles.itemText}>Добавить дверь</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => onAddWindow(roomId)}>
            <Text style={styles.itemText}>Добавить окно</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (submenu === 'name') {
    return (
      <View style={styles.root}>
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
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable style={styles.item} onPress={() => setSubmenu('settings')}>
        <Text style={styles.itemText}>Настроить комнату</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => setSubmenu('name')}>
        <Text style={styles.itemText}>Имя комнаты</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => onOpenRoom(roomId)}>
        <Text style={styles.itemText}>Открыть комнату</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 28,
    alignSelf: 'center',
    minWidth: 180,
    maxHeight: 230,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    padding: 6,
    gap: 4,
    zIndex: 30,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  scroll: {
    maxHeight: 220,
  },
  scrollContent: {
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
});
