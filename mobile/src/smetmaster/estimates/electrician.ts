import { EstimateRecord } from '../types/SmetMasterTypes';

const electricianBlueprints: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-electrician-diagnostics',
    category: 'electrician',
    work_type: 'diagnostics',
    title: 'Диагностика электрики',
    items: [{ name: 'Диагностика электрической линии', unit: 'услуга', price: 3000, quantity: 1 }],
  },
  {
    estimate_id: 'est-electrician-cable-installation',
    category: 'electrician',
    work_type: 'cable_installation',
    title: 'Прокладка кабеля',
    items: [
      { name: 'Прокладка кабеля', unit: 'м', price: 600, quantity: 1 },
      { name: 'Крепление кабеля', unit: 'услуга', price: 1500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-electrician-socket-replacement',
    category: 'electrician',
    work_type: 'socket_replacement',
    title: 'Замена розетки',
    items: [
      { name: 'Демонтаж старой розетки', unit: 'шт', price: 500, quantity: 1 },
      { name: 'Монтаж новой розетки на готовое место', unit: 'шт', price: 3000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-electrician-socket-installation',
    category: 'electrician',
    work_type: 'socket_installation',
    title: 'Монтаж новой розетки',
    items: [
      { name: 'Подготовка посадочного места', unit: 'шт', price: 1500, quantity: 1 },
      { name: 'Монтаж розетки', unit: 'шт', price: 3000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-electrician-socket-hole-creation',
    category: 'electrician',
    work_type: 'socket_hole_creation',
    title: 'Устройство отверстия под розетку',
    items: [
      { name: 'Сверление отверстия под розетку', unit: 'шт', price: 2000, quantity: 1 },
      { name: 'Монтаж подрозетника', unit: 'шт', price: 1500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-electrician-switch-installation',
    category: 'electrician',
    work_type: 'switch_installation',
    title: 'Монтаж выключателя',
    items: [{ name: 'Монтаж выключателя', unit: 'шт', price: 3000, quantity: 1 }],
  },
  {
    estimate_id: 'est-electrician-switch-replacement',
    category: 'electrician',
    work_type: 'switch_replacement',
    title: 'Замена выключателя',
    items: [
      { name: 'Демонтаж выключателя', unit: 'шт', price: 500, quantity: 1 },
      { name: 'Монтаж нового выключателя', unit: 'шт', price: 3000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-electrician-spotlight-installation',
    category: 'electrician',
    work_type: 'spotlight_installation',
    title: 'Монтаж спота',
    items: [{ name: 'Монтаж и подключение спота', unit: 'шт', price: 3000, quantity: 1 }],
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
  {
    estimate_id: 'est-electrician-power-connection',
    category: 'electrician',
    work_type: 'power_connection',
    title: 'Подключение кабеля к источнику питания',
    items: [
      { name: 'Расключение и подключение к точке питания', unit: 'услуга', price: 2000, quantity: 1 },
    ],
  },
];

export const electricianEstimates: EstimateRecord[] = electricianBlueprints.map((estimate) => ({
  ...estimate,
  base_price: estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
