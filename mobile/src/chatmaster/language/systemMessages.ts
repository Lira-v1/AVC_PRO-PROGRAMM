export const systemMessages = {
  unknownRequest: 'Пока не удалось точно понять задачу.',
  estimateNotFound: 'Не удалось подобрать подходящую работу.',
  errorMessage: 'Произошла ошибка при обработке запроса.',
} as const;

export type SystemMessages = typeof systemMessages;
