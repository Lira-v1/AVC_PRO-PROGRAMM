import { EstimateRecord } from '../types/SmetMasterTypes';

const cleaningBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-cleaning-diagnostics',
    category: 'cleaning',
    work_type: 'cleaning_diagnostics',
    title: 'Осмотр и оценка объёма уборки',
    items: [
      { name: 'осмотр объекта', unit: 'услуга', price: 1200, quantity: 1 },
      { name: 'оценка объёма работ', unit: 'услуга', price: 1300, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-cleaning-maintenance-cleaning',
    category: 'cleaning',
    work_type: 'maintenance_cleaning',
    title: 'Поддерживающая уборка',
    items: [
      { name: 'сухая уборка', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'влажная уборка', unit: 'услуга', price: 3000, quantity: 1 },
      { name: 'уборка поверхностей', unit: 'услуга', price: 2500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-cleaning-general-cleaning',
    category: 'cleaning',
    work_type: 'general_cleaning',
    title: 'Генеральная уборка',
    items: [
      { name: 'глубокая уборка помещения', unit: 'услуга', price: 6000, quantity: 1 },
      { name: 'удаление загрязнений', unit: 'услуга', price: 4500, quantity: 1 },
      { name: 'мойка поверхностей', unit: 'услуга', price: 4500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-cleaning-post-renovation-cleaning',
    category: 'cleaning',
    work_type: 'post_renovation_cleaning',
    title: 'Уборка после ремонта',
    items: [
      { name: 'удаление строительной пыли', unit: 'услуга', price: 7000, quantity: 1 },
      { name: 'уборка мусора', unit: 'услуга', price: 5000, quantity: 1 },
      { name: 'очистка поверхностей после ремонта', unit: 'услуга', price: 6000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-cleaning-window-cleaning',
    category: 'cleaning',
    work_type: 'window_cleaning',
    title: 'Мойка окон',
    items: [
      { name: 'мойка стекла', unit: 'услуга', price: 2200, quantity: 1 },
      { name: 'очистка рамы', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'очистка подоконника', unit: 'услуга', price: 1300, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-cleaning-kitchen-cleaning',
    category: 'cleaning',
    work_type: 'kitchen_cleaning',
    title: 'Уборка кухни',
    items: [
      { name: 'очистка рабочих поверхностей', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'мойка фасадов', unit: 'услуга', price: 2200, quantity: 1 },
      { name: 'уборка зоны приготовления пищи', unit: 'услуга', price: 2300, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-cleaning-bathroom-cleaning',
    category: 'cleaning',
    work_type: 'bathroom_cleaning',
    title: 'Уборка санузла',
    items: [
      { name: 'очистка сантехники', unit: 'услуга', price: 2200, quantity: 1 },
      { name: 'уборка плитки и поверхностей', unit: 'услуга', price: 2100, quantity: 1 },
      { name: 'дезинфекция', unit: 'услуга', price: 1700, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-cleaning-furniture-dry-cleaning',
    category: 'cleaning',
    work_type: 'furniture_dry_cleaning',
    title: 'Химчистка мягкой мебели',
    items: [
      { name: 'химчистка дивана / кресла', unit: 'услуга', price: 4000, quantity: 1 },
      { name: 'удаление загрязнений', unit: 'услуга', price: 3000, quantity: 1 },
      { name: 'сушка поверхности', unit: 'услуга', price: 2000, quantity: 1 },
    ],
  },
];

export const cleaningEstimates: EstimateRecord[] = cleaningBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
