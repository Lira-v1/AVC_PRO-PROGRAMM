export type NavigationSectionKnowledge = {
  id:
    | 'home_screen'
    | 'my_orders'
    | 'smetmaster'
    | 'contracts'
    | 'warranty'
    | 'become_master'
    | 'help'
    | 'settings'
    | 'profile_or_login';
  title: string;
  purpose: string;
};

export const navigationKnowledge: NavigationSectionKnowledge[] = [
  {
    id: 'home_screen',
    title: 'HomeScreen',
    purpose: 'Стартовый экран: быстрый доступ к основным действиям и разделам приложения.',
  },
  {
    id: 'my_orders',
    title: 'Мои заказы',
    purpose: 'Просмотр текущих и завершенных заказов, их статусов и деталей.',
  },
  {
    id: 'smetmaster',
    title: 'Сметмастер',
    purpose: 'Раздел для расчета стоимости работ и формирования сметы.',
  },
  {
    id: 'contracts',
    title: 'Договоры',
    purpose: 'Оформление и просмотр договоров по заказам.',
  },
  {
    id: 'warranty',
    title: 'Гарантия',
    purpose: 'Информация о гарантийных условиях и обращениях по гарантии.',
  },
  {
    id: 'become_master',
    title: 'Стать мастером',
    purpose: 'Раздел для мастеров: подача заявки и подключение к сервису.',
  },
  {
    id: 'help',
    title: 'Помощь',
    purpose: 'Поддержка пользователя, ответы на вопросы и инструкции.',
  },
  {
    id: 'settings',
    title: 'Настройки',
    purpose: 'Управление параметрами приложения и пользовательскими предпочтениями.',
  },
  {
    id: 'profile_or_login',
    title: 'Профиль / Войти',
    purpose: 'Вход в аккаунт, просмотр и изменение данных профиля.',
  },
];
