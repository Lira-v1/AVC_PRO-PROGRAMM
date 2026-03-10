import type { EstimateCalculationInput, EstimateCalculationResult } from '../../smetmaster';
import type { WorkRequestResolverDebug } from '../resolver/types';

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
  resolver: {
    inputText: string;
    exactMatch: WorkRequestResolverDebug['exactMatch'];
    fuzzyMatch: WorkRequestResolverDebug['fuzzyMatch'];
    finalSelectedResult: {
      matchType: WorkRequestResolverDebug['matchType'];
      workType: string | null;
      confidence: number;
    };
  };
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
