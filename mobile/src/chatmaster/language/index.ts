import { clarificationTemplates } from './clarificationTemplates';
import { replyTemplates } from './replyTemplates';
import { systemMessages } from './systemMessages';
import { toneRules } from './toneRules';
import { vocabulary } from './vocabulary';

export const language = {
  toneRules,
  vocabulary,
  replyTemplates,
  clarificationTemplates,
  systemMessages,
} as const;

export { toneRules, vocabulary, replyTemplates, clarificationTemplates, systemMessages };
