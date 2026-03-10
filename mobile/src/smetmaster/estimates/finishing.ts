import { EstimateRecord } from '../types/SmetMasterTypes';

const finishingBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-finishing-tile-installation',
    category: 'finishing',
    work_type: 'tile_installation',
    title: 'Укладка плитки',
    items: [
      { name: 'подготовка основания', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'укладка плитки', unit: 'услуга', price: 4500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-finishing-tile-dismantling',
    category: 'finishing',
    work_type: 'tile_dismantling',
    title: 'Демонтаж плитки',
    items: [
      { name: 'демонтаж плитки', unit: 'услуга', price: 2800, quantity: 1 },
      { name: 'очистка основания', unit: 'услуга', price: 1200, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-finishing-grouting',
    category: 'finishing',
    work_type: 'grouting',
    title: 'Затирка швов плитки',
    items: [
      { name: 'заполнение швов', unit: 'услуга', price: 1700, quantity: 1 },
      { name: 'очистка поверхности', unit: 'услуга', price: 800, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-finishing-wallpaper-installation',
    category: 'finishing',
    work_type: 'wallpaper_installation',
    title: 'Поклейка обоев',
    items: [
      { name: 'подготовка клея', unit: 'услуга', price: 1000, quantity: 1 },
      { name: 'поклейка обоев', unit: 'услуга', price: 4000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-finishing-wallpaper-removal',
    category: 'finishing',
    work_type: 'wallpaper_removal',
    title: 'Снятие старых обоев',
    items: [
      { name: 'удаление старых обоев', unit: 'услуга', price: 2000, quantity: 1 },
      { name: 'очистка поверхности', unit: 'услуга', price: 1000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-finishing-wall-preparation',
    category: 'finishing',
    work_type: 'wall_preparation',
    title: 'Подготовка стены под обои',
    items: [
      { name: 'зачистка поверхности', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'базовая подготовка стены', unit: 'услуга', price: 2000, quantity: 1 },
    ],
  },
];

export const finishingEstimates: EstimateRecord[] = finishingBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
