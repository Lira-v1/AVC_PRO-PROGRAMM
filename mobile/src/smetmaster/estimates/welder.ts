import { EstimateRecord } from '../types/SmetMasterTypes';

const welderBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-welder-diagnostics',
    category: 'welder',
    work_type: 'welder_diagnostics',
    title: 'Осмотр и диагностика сварочных работ',
    items: [
      { name: 'Осмотр конструкции', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'Оценка объёма работ', unit: 'услуга', price: 1500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-welder-small-welding',
    category: 'welder',
    work_type: 'small_welding',
    title: 'Мелкие сварочные работы',
    items: [
      { name: 'Подготовка места сварки', unit: 'услуга', price: 2000, quantity: 1 },
      { name: 'Мелкая сварка элемента', unit: 'услуга', price: 3000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-welder-gate-welding',
    category: 'welder',
    work_type: 'gate_welding',
    title: 'Сварка ворот',
    items: [
      { name: 'Подготовка металла', unit: 'услуга', price: 3000, quantity: 1 },
      { name: 'Сварка ворот', unit: 'услуга', price: 9000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-welder-wicket-welding',
    category: 'welder',
    work_type: 'wicket_welding',
    title: 'Сварка калитки',
    items: [
      { name: 'Подготовка металла', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'Сварка калитки', unit: 'услуга', price: 6500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-welder-grille-welding',
    category: 'welder',
    work_type: 'grille_welding',
    title: 'Сварка решётки',
    items: [
      { name: 'Подготовка металла', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'Сварка решётки', unit: 'услуга', price: 7500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-welder-frame-welding',
    category: 'welder',
    work_type: 'frame_welding',
    title: 'Изготовление металлического каркаса',
    items: [
      { name: 'Раскрой / подготовка элементов', unit: 'услуга', price: 4000, quantity: 1 },
      { name: 'Сборка каркаса', unit: 'услуга', price: 4000, quantity: 1 },
      { name: 'Сварка каркаса', unit: 'услуга', price: 7000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-welder-frame-reinforcement',
    category: 'welder',
    work_type: 'frame_reinforcement',
    title: 'Усиление металлической конструкции',
    items: [
      { name: 'Подготовка металла', unit: 'услуга', price: 3000, quantity: 1 },
      { name: 'Усиление конструкции сваркой', unit: 'услуга', price: 7000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-welder-metal-cutting',
    category: 'welder',
    work_type: 'metal_cutting',
    title: 'Резка металла',
    items: [{ name: 'Резка металлического элемента', unit: 'услуга', price: 4000, quantity: 1 }],
  },
  {
    estimate_id: 'est-welder-metal-structure-dismantling',
    category: 'welder',
    work_type: 'metal_structure_dismantling',
    title: 'Демонтаж сварного элемента',
    items: [{ name: 'Демонтаж / срез сварного элемента', unit: 'услуга', price: 5000, quantity: 1 }],
  },
  {
    estimate_id: 'est-welder-metal-repair',
    category: 'welder',
    work_type: 'metal_repair',
    title: 'Ремонт металлической конструкции',
    items: [
      { name: 'Зачистка повреждённого участка', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'Восстановительная сварка', unit: 'услуга', price: 4500, quantity: 1 },
    ],
  },
];

export const welderEstimates: EstimateRecord[] = welderBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
