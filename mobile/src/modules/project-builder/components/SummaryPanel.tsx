import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Project, ROOM_TYPE_LABELS } from '../types';

type SummaryPanelProps = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
};

export const SummaryPanel = ({ project, isOpen, onClose }: SummaryPanelProps) => (
  <Modal animationType="slide" visible={isOpen} transparent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Сводка проекта</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Закрыть</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.section}>Итоги по типам</Text>
          {Object.entries(project.summary.byType).map(([type, count]) => (
            <View key={type} style={styles.row}>
              <Text style={styles.key}>{type}</Text>
              <Text style={styles.value}>{count ?? 0}</Text>
            </View>
          ))}

          <Text style={styles.section}>Итоги по комнатам</Text>
          {project.rooms.map((room) => (
            <View key={room.id} style={styles.roomBlock}>
              <Text style={styles.roomTitle}>{room.name || ROOM_TYPE_LABELS[room.type]}</Text>
              {Object.entries(project.summary.byRoom[room.id] ?? {}).map(([type, count]) => (
                <View key={`${room.id}-${type}`} style={styles.row}>
                  <Text style={styles.key}>{type}</Text>
                  <Text style={styles.value}>{count ?? 0}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 14, 28, 0.45)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#101623',
  },
  close: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5ED2',
  },
  section: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2A46',
  },
  roomBlock: {
    backgroundColor: '#F8FAFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  roomTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E2A46',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  key: {
    color: '#435174',
    fontSize: 13,
  },
  value: {
    color: '#1E2A46',
    fontSize: 13,
    fontWeight: '700',
  },
});
