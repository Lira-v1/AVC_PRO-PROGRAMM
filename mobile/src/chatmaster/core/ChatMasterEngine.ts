import { requestSmetMasterEstimate } from '../adapters/smetMasterAdapter';
import { resolveIntent } from '../intents/intentResolver';
import type { ChatMasterResponse } from '../types/ChatMasterTypes';

const UNKNOWN_REPLY = 'Пока не удалось точно определить работу. Попробуйте описать задачу подробнее.';

const formatEstimateReply = (title: string, finalPrice: number): string =>
  `Похоже, это электрика. Подходит работа: ${title}. Предварительная стоимость: ${finalPrice} KZT.`;

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
      const missingReply =
        'Запрос распознан как смета, но я пока не смог точно подобрать вид работ. Добавьте больше деталей, например тип работы и проблему.';

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

    const finalReply = formatEstimateReply(adapterResult.response.estimate.title, adapterResult.response.finalPrice);

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
