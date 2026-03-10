export type BusinessRuleKnowledge = {
  id:
    | 'tariffs'
    | 'visit_fee_below_10000'
    | 'visit_fee_from_10000'
    | 'materials_not_included'
    | 'smetmaster_owns_estimation'
    | 'chatmaster_no_price_calculation';
  title: string;
  description: string;
};

export const businessRulesKnowledge: BusinessRuleKnowledge[] = [
  {
    id: 'tariffs',
    title: 'Тарифы сервиса',
    description: 'В приложении используются тарифы: Эконом, Комфорт, Бизнес.',
  },
  {
    id: 'visit_fee_below_10000',
    title: 'Выезд мастера для заказов ниже 10000 KZT',
    description: 'Если стоимость работы меньше 10000 KZT, выезд мастера составляет 2500 KZT.',
  },
  {
    id: 'visit_fee_from_10000',
    title: 'Выезд мастера для заказов от 10000 KZT',
    description: 'Если стоимость работы 10000 KZT и выше, выезд мастера включен в стоимость.',
  },
  {
    id: 'materials_not_included',
    title: 'Материалы в расчетах',
    description: 'Стоимость материалов пока не входит автоматически в итоговую цену работ.',
  },
  {
    id: 'smetmaster_owns_estimation',
    title: 'Ответственность Сметмастера',
    description: 'Сметмастер отвечает за расчет стоимости работ и формирование сметы.',
  },
  {
    id: 'chatmaster_no_price_calculation',
    title: 'Ограничение ChatMaster',
    description: 'ChatMaster не рассчитывает цену самостоятельно и направляет такие запросы в Сметмастер.',
  },
];
