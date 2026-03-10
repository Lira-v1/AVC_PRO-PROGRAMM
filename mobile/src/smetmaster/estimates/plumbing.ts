import { EstimateRecord } from '../types/SmetMasterTypes';

const plumbingBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-plumbing-diagnostics',
    category: 'plumbing',
    work_type: 'plumbing_diagnostics',
    title: 'Диагностика сантехнической системы',
    items: [{ name: 'Диагностика сантехнической линии', unit: 'услуга', price: 3000, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-mixer-replacement',
    category: 'plumbing',
    work_type: 'mixer_replacement',
    title: 'Замена смесителя',
    items: [
      { name: 'демонтаж старого смесителя', unit: 'шт', price: 1000, quantity: 1 },
      { name: 'монтаж нового смесителя', unit: 'шт', price: 3500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-plumbing-mixer-installation',
    category: 'plumbing',
    work_type: 'mixer_installation',
    title: 'Монтаж смесителя',
    items: [{ name: 'установка смесителя', unit: 'шт', price: 3500, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-sink-installation',
    category: 'plumbing',
    work_type: 'sink_installation',
    title: 'Монтаж раковины',
    items: [{ name: 'монтаж раковины', unit: 'шт', price: 4500, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-sink-replacement',
    category: 'plumbing',
    work_type: 'sink_replacement',
    title: 'Замена раковины',
    items: [
      { name: 'демонтаж старой раковины', unit: 'шт', price: 1500, quantity: 1 },
      { name: 'монтаж новой раковины', unit: 'шт', price: 4500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-plumbing-toilet-installation',
    category: 'plumbing',
    work_type: 'toilet_installation',
    title: 'Монтаж унитаза',
    items: [{ name: 'установка унитаза', unit: 'шт', price: 5000, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-toilet-replacement',
    category: 'plumbing',
    work_type: 'toilet_replacement',
    title: 'Замена унитаза',
    items: [
      { name: 'демонтаж старого унитаза', unit: 'шт', price: 2000, quantity: 1 },
      { name: 'монтаж нового унитаза', unit: 'шт', price: 5000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-plumbing-pipe-installation',
    category: 'plumbing',
    work_type: 'pipe_installation',
    title: 'Прокладка трубы',
    items: [{ name: 'монтаж трубы', unit: 'м', price: 800, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-pipe-repair',
    category: 'plumbing',
    work_type: 'pipe_repair',
    title: 'Ремонт трубы',
    items: [{ name: 'ремонт участка трубы', unit: 'услуга', price: 3500, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-siphon-installation',
    category: 'plumbing',
    work_type: 'siphon_installation',
    title: 'Монтаж сифона',
    items: [{ name: 'установка сифона', unit: 'шт', price: 2500, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-clog-removal',
    category: 'plumbing',
    work_type: 'clog_removal',
    title: 'Прочистка засора',
    items: [{ name: 'прочистка канализации', unit: 'услуга', price: 3500, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-washing-machine-connection',
    category: 'plumbing',
    work_type: 'washing_machine_connection',
    title: 'Подключение стиральной машины',
    items: [{ name: 'подключение стиральной машины', unit: 'услуга', price: 3500, quantity: 1 }],
  },
  {
    estimate_id: 'est-plumbing-dishwasher-connection',
    category: 'plumbing',
    work_type: 'dishwasher_connection',
    title: 'Подключение посудомоечной машины',
    items: [{ name: 'подключение посудомоечной машины', unit: 'услуга', price: 3500, quantity: 1 }],
  },
];

export const plumbingEstimates: EstimateRecord[] = plumbingBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
