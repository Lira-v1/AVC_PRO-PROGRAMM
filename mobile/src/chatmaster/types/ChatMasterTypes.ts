import type { EstimateCalculationInput, EstimateCalculationResult } from '../../smetmaster';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatIntent = 'estimate_request' | 'unknown';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
};

export type ChatMasterDebugTrace = {
  userMessage: string;
  resolvedIntent: ChatIntent;
  resolvedCategory: string | null;
  resolvedWorkType: string | null;
  smetMasterRequest: EstimateCalculationInput | null;
  smetMasterResponse: EstimateCalculationResult | null;
  finalChatReply: string;
};

export type ChatMasterResponse = {
  reply: string;
  intent: ChatIntent;
  payload: EstimateCalculationResult | null;
  category: string | null;
  workType: string | null;
  debug: ChatMasterDebugTrace;
};
