import { ElementType, HeightMode } from './types';

export type ElementPreset = {
  id: string;
  label: string;
  suggestedHeightMode?: HeightMode;
  suggestedHeightValueMm?: number;
};

const customPreset: ElementPreset = {
  id: 'custom',
  label: 'Своя настройка',
};

export const ELEMENT_PRESETS: Partial<Record<ElementType, ElementPreset[]>> = {
  socket: [
    { id: 'standard_socket', label: 'Стандартная розетка', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 300 },
    { id: 'above_countertop', label: 'Над столешницей', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 1150 },
    { id: 'air_conditioner', label: 'Кондиционер', suggestedHeightMode: 'from_ceiling', suggestedHeightValueMm: 250 },
    { id: 'washing_machine', label: 'Стиральная машина', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 300 },
    { id: 'boiler', label: 'Бойлер', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 1800 },
    customPreset,
  ],
  double_socket: [
    { id: 'standard_double_socket', label: 'Стандартная двойная', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 300 },
    { id: 'kitchen_double_socket', label: 'Кухонная зона', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 1150 },
    { id: 'tv_zone', label: 'TV зона', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 300 },
    customPreset,
  ],
  switch: [
    { id: 'standard_switch', label: 'Стандартный выключатель', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 900 },
    { id: 'entrance_switch', label: 'Входной выключатель', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 900 },
    { id: 'pass_through_switch', label: 'Проходной выключатель', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 900 },
    customPreset,
  ],
  double_switch: [
    { id: 'standard_double_switch', label: 'Стандартный двойной', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 900 },
    customPreset,
  ],
  light_point: [
    { id: 'ceiling_light', label: 'Основной свет', suggestedHeightMode: 'from_ceiling', suggestedHeightValueMm: 0 },
    { id: 'zone_light', label: 'Зональный свет', suggestedHeightMode: 'custom', suggestedHeightValueMm: 2100 },
    customPreset,
  ],
  junction_box: [
    { id: 'standard_junction_box', label: 'Стандартная коробка', suggestedHeightMode: 'from_ceiling', suggestedHeightValueMm: 200 },
    customPreset,
  ],
  panel: [
    { id: 'standard_panel', label: 'Стандартный щит', suggestedHeightMode: 'from_floor', suggestedHeightValueMm: 1500 },
    customPreset,
  ],
};

export const HEIGHT_MODE_OPTIONS: Array<{ value: HeightMode; label: string }> = [
  { value: 'from_floor', label: 'От пола' },
  { value: 'from_ceiling', label: 'От потолка' },
  { value: 'custom', label: 'Произвольно' },
];

export const getPresetById = (type: ElementType, presetId?: string) => {
  if (!presetId) return null;
  return ELEMENT_PRESETS[type]?.find((preset) => preset.id === presetId) ?? null;
};
