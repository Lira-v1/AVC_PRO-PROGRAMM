import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EMPTY_LOCATION, type GeoLocation } from '../types/location';

type LocationMode = 'auto' | 'manual' | 'map' | null;

type Props = {
  value: GeoLocation;
  onChange: (next: GeoLocation) => void;
  title?: string;
};

const formatAddress = (city: string, street: string, house: string, apartment: string) =>
  [city, street, house ? `д. ${house}` : '', apartment ? `кв. ${apartment}` : ''].filter(Boolean).join(', ');

export const LocationPicker = ({ value, onChange, title = 'Адрес' }: Props) => {
  const [mode, setMode] = useState<LocationMode>(null);
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [mapModal, setMapModal] = useState(false);
  const [latInput, setLatInput] = useState('43.2389');
  const [lngInput, setLngInput] = useState('76.8897');

  const summary = useMemo(() => {
    if (!value.address && value.lat == null && value.lng == null) {
      return 'Не указано';
    }

    const parts = [] as string[];
    if (value.address) {
      parts.push(value.address);
    }
    if (value.lat != null && value.lng != null) {
      parts.push(`${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`);
    }

    return parts.join(' · ');
  }, [value.address, value.lat, value.lng]);

  const pickAutomatically = () => {
    setMode('auto');
    const autoLat = 43.2389;
    const autoLng = 76.8897;
    onChange({
      address: 'Алматы, определено автоматически',
      lat: autoLat,
      lng: autoLng,
    });
  };

  const applyManualAddress = () => {
    setMode('manual');
    onChange({
      address: formatAddress(city.trim(), street.trim(), house.trim(), apartment.trim()),
      lat: value.lat,
      lng: value.lng,
    });
  };

  const applyMapPoint = () => {
    const lat = Number.parseFloat(latInput.replace(',', '.'));
    const lng = Number.parseFloat(lngInput.replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    onChange({
      address: value.address || 'Точка выбрана на карте',
      lat,
      lng,
    });
    setMode('map');
    setMapModal(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.summary}>{summary}</Text>

      <View style={styles.actions}>
        <Pressable style={styles.primaryAction} onPress={pickAutomatically}>
          <Text style={styles.primaryActionText}>Определить автоматически</Text>
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={() => setMode('manual')}>
          <Text style={styles.secondaryActionText}>Ввести адрес</Text>
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={() => setMapModal(true)}>
          <Text style={styles.secondaryActionText}>Указать на карте</Text>
        </Pressable>
      </View>

      {mode === 'manual' ? (
        <View style={styles.manualForm}>
          <TextInput style={styles.input} placeholder="Город" value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="Улица" value={street} onChangeText={setStreet} />
          <TextInput style={styles.input} placeholder="Дом" value={house} onChangeText={setHouse} />
          <TextInput style={styles.input} placeholder="Квартира" value={apartment} onChangeText={setApartment} />
          <Pressable style={styles.primaryAction} onPress={applyManualAddress}>
            <Text style={styles.primaryActionText}>Сохранить адрес</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable style={styles.clearAction} onPress={() => onChange(EMPTY_LOCATION)}>
        <Text style={styles.clearActionText}>Очистить адрес</Text>
      </Pressable>

      <Modal visible={mapModal} transparent animationType="slide" onRequestClose={() => setMapModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Указать точку на карте</Text>
            <Text style={styles.modalHint}>Введите координаты точки</Text>
            <TextInput style={styles.input} placeholder="Широта" value={latInput} onChangeText={setLatInput} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Долгота" value={lngInput} onChangeText={setLngInput} keyboardType="decimal-pad" />
            <View style={styles.modalRow}>
              <Pressable style={styles.secondaryAction} onPress={() => setMapModal(false)}>
                <Text style={styles.secondaryActionText}>Отмена</Text>
              </Pressable>
              <Pressable style={styles.primaryAction} onPress={applyMapPoint}>
                <Text style={styles.primaryActionText}>Поставить точку</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, padding: 10, backgroundColor: '#FAFCFF', gap: 8 },
  title: { color: '#61708D', fontSize: 12 },
  summary: { color: '#1B2A45', fontWeight: '600' },
  actions: { gap: 8 },
  primaryAction: { backgroundColor: '#0E5BF2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryAction: { borderWidth: 1, borderColor: '#D6E2FF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center', backgroundColor: '#EEF3FF', flex: 1 },
  secondaryActionText: { color: '#1A4EB5', fontWeight: '600', fontSize: 13 },
  manualForm: { gap: 8 },
  input: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fff', color: '#1B2A45' },
  clearAction: { alignSelf: 'flex-start' },
  clearActionText: { color: '#BA3030', fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 14, gap: 8 },
  modalTitle: { color: '#1B2A45', fontSize: 16, fontWeight: '700' },
  modalHint: { color: '#61708D' },
  modalRow: { flexDirection: 'row', gap: 8 },
});
