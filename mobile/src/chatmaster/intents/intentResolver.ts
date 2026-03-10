import type { ChatIntent } from '../types/ChatMasterTypes';

const ESTIMATE_KEYWORDS = [
  'ремонт',
  'починить',
  'замен',
  'установ',
  'монтаж',
  'розетк',
  'кран',
  'свар',
  'полк',
  'уборк',
  'люстр',
  'светильник',
  'диагностик',
  'электрик',
  'сантех',
  'работа',
  'мастер',
];

export const resolveIntent = (userText: string): ChatIntent => {
  const normalizedText = userText.toLowerCase().trim();

  if (!normalizedText) {
    return 'unknown';
  }

  const hasEstimateKeyword = ESTIMATE_KEYWORDS.some((keyword) => normalizedText.includes(keyword));

  return hasEstimateKeyword ? 'estimate_request' : 'unknown';
};
