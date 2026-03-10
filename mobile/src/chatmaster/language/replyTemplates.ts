type EstimateReplyParams = {
  category: string;
  workTitle: string;
  price: number | string;
};

type NavigationReplyParams = {
  screenName: string;
};

export const replyTemplates = {
  estimateReply: ({ category, workTitle, price }: EstimateReplyParams): string =>
    `Похоже, это ${category}. Подходит работа: ${workTitle}. Предварительная стоимость — ${price} ₸.`,

  navigationReply: ({ screenName }: NavigationReplyParams): string =>
    `Этот раздел находится в главном меню. Откройте «${screenName}».`,

  appExplanationReply: (): string =>
    'Сметмастер помогает подобрать работу и показать предварительную стоимость.',
} as const;

export type ReplyTemplates = typeof replyTemplates;
