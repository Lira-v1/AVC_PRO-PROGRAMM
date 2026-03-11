import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ELEMENT_TYPE_LABELS } from '../model/labels';
import { ELEMENT_PRESETS, HEIGHT_MODE_OPTIONS, getPresetById } from '../model/presets';
import { ElementNode, HeightMode } from '../types';

type ParametersDraft = {
  preset?: string;
  heightMode?: HeightMode;
  heightValueMm?: number;
  offsetMm?: number;
  widthMm?: number;
  note?: string;
};

type Props = {
  element: ElementNode;
  isOpen: boolean;
  onSave: (patch: ParametersDraft) => void;
  onDelete: () => void;
  onClose: () => void;
};

export const ElementParametersSheet = ({ element, isOpen, onSave, onDelete, onClose }: Props) => {
  const [preset, setPreset] = useState<string | undefined>(element.preset);
  const [heightMode, setHeightMode] = useState<HeightMode | undefined>(element.heightMode);
  const [heightValueMm, setHeightValueMm] = useState<string>(element.heightValueMm ? String(element.heightValueMm) : '');
  const [offsetMm, setOffsetMm] = useState<string>(typeof element.offsetMm === 'number' ? String(Math.round(element.offsetMm)) : '');
  const [widthMm, setWidthMm] = useState<string>(typeof element.widthMm === 'number' ? String(Math.round(element.widthMm)) : '');
  const [note, setNote] = useState<string>(element.note ?? '');

  useEffect(() => {
    setPreset(element.preset);
    setHeightMode(element.heightMode);
    setHeightValueMm(typeof element.heightValueMm === 'number' ? String(element.heightValueMm) : '');
    setOffsetMm(typeof element.offsetMm === 'number' ? String(Math.round(element.offsetMm)) : '');
    setWidthMm(typeof element.widthMm === 'number' ? String(Math.round(element.widthMm)) : '');
    setNote(element.note ?? '');
  }, [element]);

  const presets = useMemo(() => ELEMENT_PRESETS[element.type] ?? [], [element.type]);

  if (!isOpen) return null;

  const handleSelectPreset = (nextPreset: string) => {
    setPreset(nextPreset);
    const suggestion = getPresetById(element.type, nextPreset);
    if (suggestion?.suggestedHeightMode) setHeightMode(suggestion.suggestedHeightMode);
    if (typeof suggestion?.suggestedHeightValueMm === 'number') setHeightValueMm(String(suggestion.suggestedHeightValueMm));
  };

  const handleSave = () => {
    const parsedHeight = Number(heightValueMm.replace(',', '.'));
    const parsedOffset = Number(offsetMm.replace(',', '.'));
    const parsedWidth = Number(widthMm.replace(',', '.'));

    onSave({
      preset,
      heightMode,
      heightValueMm: Number.isFinite(parsedHeight) ? parsedHeight : undefined,
      offsetMm: Number.isFinite(parsedOffset) ? parsedOffset : undefined,
      widthMm: Number.isFinite(parsedWidth) ? parsedWidth : undefined,
      note: note.trim() || undefined,
    });

    onClose();
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Параметры: {ELEMENT_TYPE_LABELS[element.type]}</Text>
        <Pressable onPress={onClose}>
          <Text style={styles.closeText}>Закрыть</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {presets.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Preset</Text>
            <View style={styles.chipsWrap}>
              {presets.map((presetItem) => {
                const isActive = presetItem.id === preset;
                return (
                  <Pressable key={presetItem.id} style={[styles.chip, isActive ? styles.chipActive : null]} onPress={() => handleSelectPreset(presetItem.id)}>
                    <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{presetItem.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Режим высоты</Text>
          <View style={styles.modeRow}>
            {HEIGHT_MODE_OPTIONS.map((mode) => {
              const isActive = mode.value === heightMode;
              return (
                <Pressable key={mode.value} style={[styles.modeButton, isActive ? styles.modeButtonActive : null]} onPress={() => setHeightMode(mode.value)}>
                  <Text style={[styles.modeText, isActive ? styles.modeTextActive : null]}>{mode.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Высота (мм)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={heightValueMm} onChangeText={setHeightValueMm} placeholder="Например, 900" />
        </View>

        {element.wallId ? (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Offset по оси стены (мм)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={offsetMm} onChangeText={setOffsetMm} placeholder="Например, 1200" />
          </View>
        ) : null}

        {(element.type === 'door' || element.type === 'window') ? (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Ширина (мм)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={widthMm} onChangeText={setWidthMm} placeholder="Например, 900" />
          </View>
        ) : null}

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Комментарий</Text>
          <TextInput style={[styles.input, styles.noteInput]} multiline value={note} onChangeText={setNote} placeholder="Свободная заметка" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.footerButton, styles.deleteButton]} onPress={onDelete}>
          <Text style={[styles.footerButtonText, styles.deleteText]}>Удалить</Text>
        </Pressable>
        <Pressable style={styles.footerButton} onPress={onClose}>
          <Text style={styles.footerButtonText}>Отмена</Text>
        </Pressable>
        <Pressable style={[styles.footerButton, styles.saveButton]} onPress={handleSave}>
          <Text style={[styles.footerButtonText, styles.saveText]}>Сохранить</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    padding: 12,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#1C2743', flex: 1, marginRight: 8 },
  closeText: { color: '#4A5F91', fontSize: 13, fontWeight: '600' },
  content: { gap: 12, paddingBottom: 8 },
  group: { gap: 6 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#2A3756' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 8, borderWidth: 1, borderColor: '#BBC5DC', paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#FFF' },
  chipActive: { borderColor: '#2D5ED2', backgroundColor: '#2D5ED2' },
  chipText: { fontSize: 12, color: '#2A3756', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#BBC5DC', paddingVertical: 8, alignItems: 'center' },
  modeButtonActive: { borderColor: '#2D5ED2', backgroundColor: '#E3ECFF' },
  modeText: { fontSize: 12, color: '#2A3756', fontWeight: '600' },
  modeTextActive: { color: '#1E3E8A' },
  input: {
    borderWidth: 1,
    borderColor: '#BBC5DC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1C2743',
    backgroundColor: '#FFFFFF',
  },
  noteInput: { minHeight: 72, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 8 },
  footerButton: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#BBC5DC', alignItems: 'center', paddingVertical: 10 },
  footerButtonText: { fontSize: 13, fontWeight: '600', color: '#2A3756' },
  saveButton: { backgroundColor: '#2D5ED2', borderColor: '#2D5ED2' },
  saveText: { color: '#FFFFFF' },
  deleteButton: { borderColor: '#D64343' },
  deleteText: { color: '#D64343' },
});
