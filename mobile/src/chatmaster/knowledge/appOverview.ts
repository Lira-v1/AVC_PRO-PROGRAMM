export type AppOverviewKnowledge = {
  appName: string;
  summary: string;
  capabilities: string[];
};

export const appOverviewKnowledge: AppOverviewKnowledge = {
  appName: 'MasterPro',
  summary:
    'MasterPro — это сервис вызова мастеров, который помогает пользователю оформить заказ, получить расчет стоимости через Сметмастер и сопровождать заказ до завершения.',
  capabilities: [
    'Вызов мастеров по разным видам работ',
    'Создание и ведение заказа',
    'Расчет стоимости через Сметмастер',
    'Оформление и хранение договоров',
    'Поддержка гарантийных обязательств',
    'Просмотр истории заказов',
    'Помощь пользователю по работе с приложением',
  ],
};
