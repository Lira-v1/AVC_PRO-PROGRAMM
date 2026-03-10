import { requestSmetMasterEstimate } from '../adapters/smetMasterAdapter';
import { resolveIntent } from '../intents/intentResolver';
import { language } from '../language';
import { WorkRequestResolver } from '../resolver';
import type { WorkRequestResult } from '../resolver/types';
import type { ChatMasterResponse } from '../types/ChatMasterTypes';

const UNKNOWN_REPLY = language.systemMessages.unknownRequest;
const workRequestResolver = new WorkRequestResolver();

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
