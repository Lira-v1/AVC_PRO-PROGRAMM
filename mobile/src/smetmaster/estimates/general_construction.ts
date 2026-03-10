import { EstimateRecord } from '../types/SmetMasterTypes';

const generalConstructionBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-general-construction-dismantling',
    category: 'general_construction',
    work_type: 'construction_dismantling',
    title: 'Демонтаж строительной конструкции',
    items: [
      { name: 'Демонтаж элемента конструкции', unit: 'услуга', price: 3500, quantity: 1 },
      { name: 'Уборка после демонтажа', unit: 'услуга', price: 1500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-drilling',
    category: 'general_construction',
    work_type: 'concrete_drilling',
    title: 'Бурение отверстия в стене',
    items: [{ name: 'Бурение отверстия', unit: 'шт', price: 3000, quantity: 1 }],
  },
  {
    estimate_id: 'est-general-construction-wall-chasing',
    category: 'general_construction',
    work_type: 'wall_chasing',
    title: 'Штробление стены',
    items: [{ name: 'Штробление стены', unit: 'м', price: 3500, quantity: 1 }],
  },
  {
    estimate_id: 'est-general-construction-opening-creation',
    category: 'general_construction',
    work_type: 'opening_creation',
    title: 'Устройство проёма',
    items: [
      { name: 'Подготовка участка', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'Создание строительного проёма', unit: 'услуга', price: 5500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-surface-preparation',
    category: 'general_construction',
    work_type: 'surface_preparation',
    title: 'Подготовка строительного основания',
    items: [
      { name: 'Очистка поверхности', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'Выравнивание основания', unit: 'услуга', price: 2500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-minor-concrete-work',
    category: 'general_construction',
    work_type: 'minor_concrete_work',
    title: 'Мелкие бетонные работы',
    items: [
      { name: 'Приготовление раствора', unit: 'услуга', price: 2000, quantity: 1 },
      { name: 'Заливка небольшого участка', unit: 'услуга', price: 4000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-material-moving',
    category: 'general_construction',
    work_type: 'material_moving',
    title: 'Перенос строительных материалов',
    items: [{ name: 'Перенос строительных материалов', unit: 'услуга', price: 3000, quantity: 1 }],
  },
];

export const generalConstructionEstimates: EstimateRecord[] = generalConstructionBlueprints.map(
  (estimate) => ({
    ...estimate,
    base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }),
);
