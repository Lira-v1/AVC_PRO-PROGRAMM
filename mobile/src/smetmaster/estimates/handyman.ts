import { EstimateRecord } from '../types/SmetMasterTypes';

const handymanBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-handyman-diagnostics',
    category: 'handyman',
    work_type: 'handyman_diagnostics',
    title: 'Осмотр и мелкая диагностика',
    items: [{ name: 'осмотр задачи', unit: 'услуга', price: 2500, quantity: 1 }],
  },
  {
    estimate_id: 'est-handyman-drilling',
    category: 'handyman',
    work_type: 'drilling',
    title: 'Сверление отверстия',
    items: [{ name: 'сверление отверстия в стене', unit: 'шт', price: 1000, quantity: 1 }],
  },
  {
    estimate_id: 'est-handyman-mount-installation',
    category: 'handyman',
    work_type: 'mount_installation',
    title: 'Монтаж крепления',
    items: [{ name: 'установка крепления', unit: 'шт', price: 1500, quantity: 1 }],
  },
  {
    estimate_id: 'est-handyman-shelf-installation',
    category: 'handyman',
    work_type: 'shelf_installation',
    title: 'Повесить полку',
    items: [
      { name: 'разметка', unit: 'услуга', price: 500, quantity: 1 },
      { name: 'установка полки', unit: 'шт', price: 2500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-handyman-tv-mount-installation',
    category: 'handyman',
    work_type: 'tv_mount_installation',
    title: 'Повесить телевизор',
    items: [
      { name: 'разметка крепления', unit: 'услуга', price: 1000, quantity: 1 },
      { name: 'установка кронштейна', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'монтаж телевизора', unit: 'услуга', price: 2500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-handyman-curtain-rod-installation',
    category: 'handyman',
    work_type: 'curtain_rod_installation',
    title: 'Повесить карниз',
    items: [
      { name: 'разметка', unit: 'услуга', price: 1000, quantity: 1 },
      { name: 'установка карниза', unit: 'услуга', price: 2500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-handyman-furniture-assembly',
    category: 'handyman',
    work_type: 'furniture_assembly',
    title: 'Сборка мебели',
    items: [{ name: 'сборка мебельного элемента', unit: 'услуга', price: 5000, quantity: 1 }],
  },
  {
    estimate_id: 'est-handyman-minor-repair',
    category: 'handyman',
    work_type: 'minor_repair',
    title: 'Мелкий бытовой ремонт',
    items: [{ name: 'устранение мелкой неисправности', unit: 'услуга', price: 3500, quantity: 1 }],
  },
  {
    estimate_id: 'est-handyman-appliance-installation',
    category: 'handyman',
    work_type: 'appliance_installation',
    title: 'Установка бытовой техники',
    items: [
      { name: 'подготовка места установки', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'монтаж техники', unit: 'услуга', price: 3500, quantity: 1 },
    ],
  },
];

export const handymanEstimates: EstimateRecord[] = handymanBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
