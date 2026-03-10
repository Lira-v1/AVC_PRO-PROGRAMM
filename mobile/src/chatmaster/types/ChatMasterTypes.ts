import type { EstimateCalculationInput, EstimateCalculationResult } from '../../smetmaster';
import type { WorkRequestResolverDebug } from '../resolver/types';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatIntent = 'estimate_request' | 'unknown';

export type ChatMasterContext = 'general_assistant' | 'order_assistant';

export type OrderAssistantWorkSuggestion = {
  category: string;
  workType: string;
  title: string;
  estimatedPrice: number | null;
};

export type OrderAssistantAction = 'set' | 'append' | 'remove';

export type OrderAssistantPayload = {
  action: OrderAssistantAction;
  suggestions: OrderAssistantWorkSuggestion[];
  categorySuggestions: string[];
};

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
  context: ChatMasterContext;
  orderAssistantPayload: OrderAssistantPayload | null;
  debug: ChatMasterDebugTrace;
};
