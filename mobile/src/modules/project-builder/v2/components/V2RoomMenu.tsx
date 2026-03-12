import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  roomId: string;
  onRenamePreset: (roomId: string, name: string) => void;
  onCustomRename: (roomId: string) => void;
  onOpenSettings: (roomId: string) => void;
  onOpenRoom: (roomId: string) => void;
};

export const V2RoomMenu = ({ roomId, onRenamePreset, onCustomRename, onOpenSettings, onOpenRoom }: Props) => {
  const [submenu, setSubmenu] = useState<'root' | 'name'>('root');

  useEffect(() => {
    setSubmenu('root');
  }, [roomId]);

  const renderRootMenu = () => (
    <>
      <Pressable style={styles.item} onPress={() => onOpenSettings(roomId)}>
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

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {submenu === 'root' ? renderRootMenu() : renderNameMenu()}
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
    maxWidth: 220,
    maxHeight: 220,
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
    maxHeight: 220,
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
});
