import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ELEMENT_TYPE_LABELS } from '../model/labels';
import { getPresetById } from '../model/presets';
import { ElementNode, Room } from '../types';

type Props = {
  element: ElementNode;
  room: Room | null;
  onOpenParameters: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export const ElementQuickCard = ({ element, room, onOpenParameters, onDuplicate, onDelete, onClose }: Props) => {
  const presetLabel = getPresetById(element.type, element.preset)?.label ?? element.preset;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{ELEMENT_TYPE_LABELS[element.type]}</Text>
        <Pressable onPress={onClose}>
          <Text style={styles.closeText}>Закрыть</Text>
        </Pressable>
      </View>
      {room ? <Text style={styles.meta}>Комната: {room.name}</Text> : null}
      {presetLabel ? <Text style={styles.meta}>Preset: {presetLabel}</Text> : null}
      {typeof element.heightValueMm === 'number' ? <Text style={styles.meta}>Высота: {element.heightValueMm} мм</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={onOpenParameters}>
          <Text style={[styles.actionText, styles.primaryText]}>Настроить параметры</Text>
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={onDuplicate}>
          <Text style={styles.actionText}>Дублировать</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
          <Text style={[styles.actionText, styles.deleteText]}>Удалить</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    padding: 12,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#1C2743' },
  closeText: { fontSize: 13, color: '#4A5F91', fontWeight: '600' },
  meta: { fontSize: 13, color: '#4F5F82' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BBC5DC',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: '#2D5ED2', borderColor: '#2D5ED2' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#2A3756' },
  primaryText: { color: '#FFFFFF' },
  deleteButton: { borderColor: '#D64343' },
  deleteText: { color: '#D64343' },
});
