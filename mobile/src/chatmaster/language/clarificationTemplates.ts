export const clarificationTemplates = {
  requestDetails: (): string => 'Уточните, пожалуйста, что именно нужно сделать.',

  categoryCheck: (category: string): string => `Это больше похоже на ${category}. Подходит?`,

  notEnoughInfo: (): string => 'Нужно немного больше информации, чтобы подобрать работу.',
} as const;

export type ClarificationTemplates = typeof clarificationTemplates;
