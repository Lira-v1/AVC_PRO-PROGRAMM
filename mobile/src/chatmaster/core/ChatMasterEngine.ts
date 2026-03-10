import { requestSmetMasterEstimate } from '../adapters/smetMasterAdapter';
import { resolveIntent } from '../intents/intentResolver';
import { language } from '../language';
import type { ChatMasterResponse } from '../types/ChatMasterTypes';

const UNKNOWN_REPLY = language.systemMessages.unknownRequest;

export class ChatMasterEngine {
  public static processUserMessage(userMessage: string): ChatMasterResponse {
    const resolvedIntent = resolveIntent(userMessage);

    if (resolvedIntent !== 'estimate_request') {
      return {
        reply: UNKNOWN_REPLY,
        intent: resolvedIntent,
        payload: null,
        category: null,
        workType: null,
        debug: {
          userMessage,
          resolvedIntent,
          resolvedCategory: null,
          resolvedWorkType: null,
          smetMasterRequest: null,
          smetMasterResponse: null,
          finalChatReply: UNKNOWN_REPLY,
        },
      };
    }

    const adapterResult = requestSmetMasterEstimate(userMessage);

    if (!adapterResult.response || !adapterResult.category || !adapterResult.workType) {
      const missingReply = language.clarificationTemplates.notEnoughInfo();

      return {
        reply: missingReply,
        intent: resolvedIntent,
        payload: null,
        category: adapterResult.category,
        workType: adapterResult.workType,
        debug: {
          userMessage,
          resolvedIntent,
          resolvedCategory: adapterResult.category,
          resolvedWorkType: adapterResult.workType,
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
      debug: {
        userMessage,
        resolvedIntent,
        resolvedCategory: adapterResult.category,
        resolvedWorkType: adapterResult.workType,
        smetMasterRequest: adapterResult.request,
        smetMasterResponse: adapterResult.response,
        finalChatReply: finalReply,
      },
    };
  }
}
