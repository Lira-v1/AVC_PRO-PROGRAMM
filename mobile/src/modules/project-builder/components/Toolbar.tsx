import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { TOOL_TYPES, ToolType } from '../types';

const TOOL_LABELS: Record<ToolType, string> = {
  select: 'Выбор',
  socket: 'Розетка',
  double_socket: '2x Розетка',
  switch: 'Выключатель',
  double_switch: '2x Выкл.',
  light_point: 'Свет',
  junction_box: 'Распред.',
  panel: 'Щит',
  door: 'Дверь',
  window: 'Окно',
  delete: 'Удалить',
};

type Props = {
  tool: ToolType;
  onSelectTool: (tool: ToolType) => void;
};

export const Toolbar = ({ tool, onSelectTool }: Props) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {TOOL_TYPES.map((item) => (
        <Pressable key={item} style={[styles.button, tool === item ? styles.buttonActive : null]} onPress={() => onSelectTool(item)}>
          <Text style={[styles.text, tool === item ? styles.textActive : null]}>{TOOL_LABELS[item]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8, paddingRight: 10 },
  button: {
    borderWidth: 1,
    borderColor: '#BBC5DC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  buttonActive: { backgroundColor: '#2D5ED2', borderColor: '#2D5ED2' },
  text: { fontSize: 12, color: '#2A3756', fontWeight: '600' },
  textActive: { color: '#FFF' },
});
