import { requestSmetMasterEstimate } from '../adapters/smetMasterAdapter';
import { resolveIntent } from '../intents/intentResolver';
import { language } from '../language';
import { WorkRequestResolver } from '../resolver';
import type { WorkRequestResult } from '../resolver/types';
import type {
  ChatMasterContext,
  ChatMasterResponse,
  OrderAssistantAction,
  OrderAssistantPayload,
  OrderAssistantWorkSuggestion,
} from '../types/ChatMasterTypes';

const UNKNOWN_REPLY = language.systemMessages.unknownRequest;
const workRequestResolver = new WorkRequestResolver();

const ORDER_REMOVE_MARKERS = ['без', 'убери', 'убрать', 'не нужно', 'исключи', 'отмени'];

const splitIntoCandidatePhrases = (userMessage: string): string[] => {
  return userMessage
    .split(/[,.!?]|\sи\s|\sеще\s|\sещё\s/gi)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
};

const resolveOrderSuggestions = (userMessage: string): OrderAssistantWorkSuggestion[] => {
  const allCandidates = [userMessage, ...splitIntoCandidatePhrases(userMessage)];
  const seen = new Set<string>();
  const suggestions: OrderAssistantWorkSuggestion[] = [];

  allCandidates.forEach((candidate) => {
    const resolved = workRequestResolver.resolveRequest(candidate);
    if (!resolved.category || !resolved.workType) {
      return;
    }

    const key = `${resolved.category}:${resolved.workType}`;
    if (seen.has(key)) {
      return;
    }

    const adapterResult = requestSmetMasterEstimate(resolved);
    const title = adapterResult.response?.estimate.title ?? resolved.workType;

    suggestions.push({
      category: resolved.category,
      workType: resolved.workType,
      title,
      estimatedPrice: adapterResult.response?.finalPrice ?? null,
    });

    seen.add(key);
  });

  return suggestions;
};

const detectOrderAction = (userMessage: string): OrderAssistantAction => {
  const normalized = userMessage.toLowerCase();
  return ORDER_REMOVE_MARKERS.some((marker) => normalized.includes(marker)) ? 'remove' : 'append';
};

const buildOrderAssistantReply = (payload: OrderAssistantPayload): string => {
  if (payload.suggestions.length === 0) {
    return 'Пока не получилось точно определить работу. Уточните, что нужно сделать, пожалуйста.';
  }

  const list = payload.suggestions.map((item) => `- ${item.title}`).join('\n');
  const prefix = payload.action === 'remove' ? 'Похоже, нужно убрать из заявки:' : 'Похоже, подходят такие работы:';
  return `${prefix}\n${list}\n\nПодходит?`;
};

type ProcessMessageOptions = {
  context?: ChatMasterContext;
};

const buildResolverDebug = (userMessage: string, resolvedWorkRequest: WorkRequestResult) => ({
  inputText: userMessage,
  exactMatch: resolvedWorkRequest.debug?.exactMatch ?? null,
  fuzzyMatch: resolvedWorkRequest.debug?.fuzzyMatch ?? null,
  finalSelectedResult: {
    matchType: resolvedWorkRequest.debug?.matchType ?? 'none',
    workType: resolvedWorkRequest.workType,
    confidence: resolvedWorkRequest.confidence,
  },
});

export class ChatMasterEngine {
  public static processUserMessage(userMessage: string, options: ProcessMessageOptions = {}): ChatMasterResponse {
    const context: ChatMasterContext = options.context ?? 'general_assistant';

    if (context === 'order_assistant') {
      const suggestions = resolveOrderSuggestions(userMessage);
      const orderAssistantPayload: OrderAssistantPayload = {
        action: detectOrderAction(userMessage),
        suggestions,
        categorySuggestions: [...new Set(suggestions.map((item) => item.category))],
      };
      const reply = buildOrderAssistantReply(orderAssistantPayload);

      return {
        reply,
        intent: suggestions.length > 0 ? 'estimate_request' : 'unknown',
        payload: null,
        category: suggestions[0]?.category ?? null,
        workType: suggestions[0]?.workType ?? null,
        context,
        orderAssistantPayload,
        debug: {
          userMessage,
          resolvedIntent: suggestions.length > 0 ? 'estimate_request' : 'unknown',
          resolvedCategory: suggestions[0]?.category ?? null,
          resolvedWorkType: suggestions[0]?.workType ?? null,
          resolver: {
            inputText: userMessage,
            exactMatch: null,
            fuzzyMatch: null,
            finalSelectedResult: {
              matchType: suggestions.length > 0 ? 'fuzzy' : 'none',
              workType: suggestions[0]?.workType ?? null,
              confidence: suggestions.length > 0 ? 0.7 : 0,
            },
          },
          smetMasterRequest: null,
          smetMasterResponse: null,
          finalChatReply: reply,
        },
      };
    }

    const resolvedIntent = resolveIntent(userMessage);

    if (resolvedIntent !== 'estimate_request') {
      return {
        reply: UNKNOWN_REPLY,
        intent: resolvedIntent,
        payload: null,
        category: null,
        workType: null,
        context,
        orderAssistantPayload: null,
        debug: {
          userMessage,
          resolvedIntent,
          resolvedCategory: null,
          resolvedWorkType: null,
          resolver: {
            inputText: userMessage,
            exactMatch: null,
            fuzzyMatch: null,
            finalSelectedResult: {
              matchType: 'none',
              workType: null,
              confidence: 0,
            },
          },
          smetMasterRequest: null,
          smetMasterResponse: null,
          finalChatReply: UNKNOWN_REPLY,
        },
      };
    }

    const resolvedWorkRequest = workRequestResolver.resolveRequest(userMessage);
    const adapterResult = requestSmetMasterEstimate(resolvedWorkRequest);
    const resolverDebug = buildResolverDebug(userMessage, resolvedWorkRequest);

    if (!adapterResult.response || !adapterResult.category || !adapterResult.workType) {
      const missingReply = language.clarificationTemplates.notEnoughInfo();

      return {
        reply: missingReply,
        intent: resolvedIntent,
        payload: null,
        category: adapterResult.category,
        workType: adapterResult.workType,
        context,
        orderAssistantPayload: null,
        debug: {
          userMessage,
          resolvedIntent,
          resolvedCategory: adapterResult.category,
          resolvedWorkType: adapterResult.workType,
          resolver: resolverDebug,
          smetMasterRequest: adapterResult.request,
          smetMasterResponse: adapterResult.response,
          finalChatReply: missingReply,
        },
      };
    }

    const finalReply = language.replyTemplates.estimateReply({
      category: adapterResult.category,
      workTitle: adapterResult.response.estimate.title,
      price: adapterResult.response.finalPrice,
    });

    return {
      reply: finalReply,
      intent: resolvedIntent,
      payload: adapterResult.response,
      category: adapterResult.category,
      workType: adapterResult.workType,
      context,
      orderAssistantPayload: null,
      debug: {
        userMessage,
        resolvedIntent,
        resolvedCategory: adapterResult.category,
        resolvedWorkType: adapterResult.workType,
        resolver: resolverDebug,
        smetMasterRequest: adapterResult.request,
        smetMasterResponse: adapterResult.response,
        finalChatReply: finalReply,
      },
    };
  }
}
