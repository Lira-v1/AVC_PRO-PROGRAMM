import { EstimateRecord } from '../types/SmetMasterTypes';

const electricianBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-electrician-diagnostics',
    category: 'electrician',
    work_type: 'diagnostics',
    title: 'Диагностика электрики',
    items: [{ name: 'Диагностика неисправности', unit: 'услуга', price: 2000, quantity: 1 }],
  },
  {
    estimate_id: 'est-electrician-socket-replacement',
    category: 'electrician',
    work_type: 'socket_replacement',
    title: 'Замена розетки',
    items: [
      { name: 'Демонтаж старой розетки', unit: 'шт', price: 700, quantity: 1 },
      { name: 'Монтаж новой розетки', unit: 'шт', price: 2800, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-electrician-light-installation',
    category: 'electrician',
    work_type: 'light_installation',
    title: 'Монтаж светильника',
    items: [
      { name: 'Подготовка точки подключения', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'Установка светильника', unit: 'шт', price: 3500, quantity: 1 },
    ],
  },
];

export const electricianEstimates: EstimateRecord[] = electricianBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
