import { EstimateRecord } from '../types/SmetMasterTypes';

const generalConstructionBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-general-construction-dismantling',
    category: 'general_construction',
    work_type: 'construction_dismantling',
    title: 'Демонтаж строительной конструкции',
    items: [
      { name: 'демонтаж элемента конструкции', unit: 'услуга', price: 3000, quantity: 1 },
      { name: 'уборка после демонтажа', unit: 'услуга', price: 2000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-drilling',
    category: 'general_construction',
    work_type: 'concrete_drilling',
    title: 'Бурение отверстия в стене',
    items: [{ name: 'бурение отверстия', unit: 'шт', price: 3000, quantity: 1 }],
  },
  {
    estimate_id: 'est-general-construction-wall-chasing',
    category: 'general_construction',
    work_type: 'wall_chasing',
    title: 'Штробление стены',
    items: [{ name: 'штробление стены', unit: 'м', price: 3500, quantity: 1 }],
  },
  {
    estimate_id: 'est-general-construction-opening-creation',
    category: 'general_construction',
    work_type: 'opening_creation',
    title: 'Устройство проёма',
    items: [
      { name: 'подготовка участка', unit: 'услуга', price: 3000, quantity: 1 },
      { name: 'создание строительного проёма', unit: 'услуга', price: 5000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-surface-preparation',
    category: 'general_construction',
    work_type: 'surface_preparation',
    title: 'Подготовка строительного основания',
    items: [
      { name: 'очистка поверхности', unit: 'услуга', price: 2000, quantity: 1 },
      { name: 'выравнивание основания', unit: 'услуга', price: 2000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-minor-concrete-work',
    category: 'general_construction',
    work_type: 'minor_concrete_work',
    title: 'Мелкие бетонные работы',
    items: [
      { name: 'приготовление раствора', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'заливка небольшого участка', unit: 'услуга', price: 3500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-general-construction-material-moving',
    category: 'general_construction',
    work_type: 'material_moving',
    title: 'Перенос строительных материалов',
    items: [{ name: 'перенос строительных материалов', unit: 'услуга', price: 3000, quantity: 1 }],
  },
];

export const generalConstructionEstimates: EstimateRecord[] = generalConstructionBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
