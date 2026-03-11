import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Project } from '../types';

type ProjectCardProps = {
  project: Project;
  lastSavedAt: string | null;
  onOpenSummary: () => void;
  onSendToEstimate: () => void;
  onSave: () => void;
  onEdit: () => void;
};

const OBJECT_TYPE_LABELS: Record<Project['objectType'], string> = {
  apartment: 'Квартира',
  house: 'Дом',
  warehouse: 'Склад',
  other: 'Другое',
};

export const ProjectCard = ({ project, lastSavedAt, onOpenSummary, onSendToEstimate, onSave, onEdit }: ProjectCardProps) => (
  <View style={styles.card}>
    <Text style={styles.title}>{project.title}</Text>
    <Text style={styles.meta}>Тип объекта: {OBJECT_TYPE_LABELS[project.objectType]}</Text>
    <Text style={styles.meta}>Комнат: {project.rooms.length}</Text>
    <Text style={styles.meta}>Розетки: {(project.summary.byType.socket ?? 0) + (project.summary.byType.double_socket ?? 0)}</Text>
    <Text style={styles.meta}>Выключатели: {(project.summary.byType.switch ?? 0) + (project.summary.byType.double_switch ?? 0)}</Text>
    <Text style={styles.meta}>Световые точки: {project.summary.byType.light_point ?? 0}</Text>
    <Text style={styles.meta}>Щиты: {project.summary.byType.panel ?? 0}</Text>
    <Text style={styles.meta}>Статус: {project.status}</Text>
    <Text style={styles.meta}>Обновлён: {new Date(project.updatedAt).toLocaleString()}</Text>
    {lastSavedAt ? <Text style={styles.meta}>Сохранено: {new Date(lastSavedAt).toLocaleString()}</Text> : null}

    <View style={styles.buttonsRow}>
      <Pressable style={styles.buttonOutline} onPress={onOpenSummary}>
        <Text style={styles.buttonOutlineText}>Открыть сводку</Text>
      </Pressable>
      <Pressable style={styles.buttonPrimary} onPress={onSendToEstimate}>
        <Text style={styles.buttonPrimaryText}>Передать в смету</Text>
      </Pressable>
    </View>

    <View style={styles.buttonsRow}>
      <Pressable style={styles.buttonOutline} onPress={onSave}>
        <Text style={styles.buttonOutlineText}>Сохранить проект</Text>
      </Pressable>
      <Pressable style={styles.buttonOutline} onPress={onEdit}>
        <Text style={styles.buttonOutlineText}>Редактировать</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#D7DEEE',
    borderWidth: 1,
    padding: 12,
    gap: 4,
    marginTop: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2743',
    marginBottom: 4,
  },
  meta: {
    color: '#435174',
    fontSize: 13,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#3461D5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonOutline: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBC5DC',
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonOutlineText: {
    color: '#2A3756',
    fontSize: 13,
    fontWeight: '600',
  },
});
