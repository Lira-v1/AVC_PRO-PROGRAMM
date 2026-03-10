export const vocabulary = {
  appName: 'Сметмастер',
  specialist: 'Мастер',
  fieldVisit: 'Выезд мастера',
  preliminaryPrice: 'Предварительная стоимость',
  order: 'Заказ',
  workCategory: 'Категория работ',
  materials: 'Материалы',
  tariff: 'Тариф',
  appSection: 'Раздел приложения',
} as const;

export type Vocabulary = typeof vocabulary;
