import { ServiceItem, ServicePricing } from '../types';

export const SERVICES: ServiceItem[] = [
  { id: 'socket_replace', category: 'Розетки', title: 'Замена розетки', unit: 'шт' },
  { id: 'socket_install', category: 'Розетки', title: 'Монтаж новой розетки', unit: 'шт' },
  { id: 'switch_replace', category: 'Розетки', title: 'Замена выключателя', unit: 'шт' },
  { id: 'cable_laying', category: 'Кабель', title: 'Прокладка кабеля', unit: 'м' },
  { id: 'cable_channel', category: 'Кабель', title: 'Монтаж кабель-канала', unit: 'м' },
  { id: 'panel_install', category: 'Щит', title: 'Установка щита', unit: 'шт' },
  { id: 'breaker_replace', category: 'Щит', title: 'Замена автомата', unit: 'шт' },
  { id: 'meter_connect', category: 'Щит', title: 'Подключение счетчика', unit: 'шт' },
  { id: 'lamp_install', category: 'Освещение', title: 'Установка светильника', unit: 'шт' },
  { id: 'chandelier_install', category: 'Освещение', title: 'Монтаж люстры', unit: 'шт' },
  { id: 'spotlights_group', category: 'Освещение', title: 'Монтаж группы точек света', unit: 'группа' },
  { id: 'diagnostics', category: 'Другое', title: 'Диагностика электропроводки', unit: 'услуга' },
  { id: 'emergency_call', category: 'Другое', title: 'Аварийный выезд', unit: 'выезд' }
];

export const PRICES: Record<string, ServicePricing> = {
  socket_replace: { economy: 300, comfort: 450, business: 600 },
  socket_install: { economy: 450, comfort: 600, business: 800 },
  switch_replace: { economy: 280, comfort: 400, business: 550 },
  cable_laying: { economy: 120, comfort: 170, business: 230 },
  cable_channel: { economy: 160, comfort: 220, business: 280 },
  panel_install: { economy: 2500, comfort: 3400, business: 4500 },
  breaker_replace: { economy: 500, comfort: 700, business: 950 },
  meter_connect: { economy: 1900, comfort: 2600, business: 3400 },
  lamp_install: { economy: 700, comfort: 950, business: 1300 },
  chandelier_install: { economy: 1300, comfort: 1700, business: 2200 },
  spotlights_group: { economy: 2100, comfort: 2800, business: 3600 },
  diagnostics: { economy: 900, comfort: 1300, business: 1700 },
  emergency_call: { economy: 1500, comfort: 2200, business: 2900 }
};
