import { appOverviewKnowledge } from './appOverview';
import { businessRulesKnowledge } from './businessRules';
import { navigationKnowledge } from './navigationKnowledge';
import { responseRulesKnowledge } from './responseRules';
import { serviceCategoriesKnowledge } from './serviceCategories';

export const chatMasterKnowledgeBase = {
  appOverview: appOverviewKnowledge,
  serviceCategories: serviceCategoriesKnowledge,
  navigation: navigationKnowledge,
  businessRules: businessRulesKnowledge,
  responseRules: responseRulesKnowledge,
  architecture: {
    chatMasterRole:
      'ChatMaster использует базу знаний для объяснения приложения MasterPro, правил и навигации.',
    smetMasterRole: 'SmetMaster используется только для расчета смет и стоимости работ.',
    separationRule: 'Знания о приложении и знания о расчетах должны быть разделены.',
  },
} as const;

export { appOverviewKnowledge } from './appOverview';
export { businessRulesKnowledge } from './businessRules';
export { navigationKnowledge } from './navigationKnowledge';
export { responseRulesKnowledge } from './responseRules';
export { serviceCategoriesKnowledge } from './serviceCategories';

export type { AppOverviewKnowledge } from './appOverview';
export type { BusinessRuleKnowledge } from './businessRules';
export type { NavigationSectionKnowledge } from './navigationKnowledge';
export type { ResponseRuleKnowledge } from './responseRules';
export type { ServiceCategoryKnowledge } from './serviceCategories';
