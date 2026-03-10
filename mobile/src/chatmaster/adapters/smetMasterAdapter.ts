import { SmetMasterEngine, type EstimateCalculationInput, type EstimateCalculationResult, type TariffType } from '../../smetmaster';

type ResolverRule = {
  category: string;
  workType: string;
  keywords: string[];
};

const DEFAULT_TARIFF: TariffType = 'economy';

const ELECTRICIAN_RULES: ResolverRule[] = [
  {
    category: 'electrician',
    workType: 'socket_replacement',
    keywords: ['заменить розетку', 'поменять розетку', 'розетк'],
  },
  {
    category: 'electrician',
    workType: 'light_installation',
    keywords: ['светильник', 'люстр', 'ламп'],
  },
  {
    category: 'electrician',
    workType: 'diagnostics',
    keywords: ['диагностика электрики', 'диагностик', 'проверить электрику', 'нет света'],
  },
];

export type SmetMasterAdapterResult = {
  category: string | null;
  workType: string | null;
  request: EstimateCalculationInput | null;
  response: EstimateCalculationResult | null;
};

const resolveCategoryAndWorkType = (userText: string): Pick<SmetMasterAdapterResult, 'category' | 'workType'> => {
  const normalizedText = userText.toLowerCase().trim();
  const match = ELECTRICIAN_RULES.find((rule) => rule.keywords.some((keyword) => normalizedText.includes(keyword)));

  if (!match) {
    return { category: null, workType: null };
  }

  return {
    category: match.category,
    workType: match.workType,
  };
};

export const requestSmetMasterEstimate = (userText: string): SmetMasterAdapterResult => {
  const { category, workType } = resolveCategoryAndWorkType(userText);

  if (!category || !workType) {
    return {
      category,
      workType,
      request: null,
      response: null,
    };
  }

  const request: EstimateCalculationInput = {
    category,
    workType,
    tariff: DEFAULT_TARIFF,
  };

  return {
    category,
    workType,
    request,
    response: SmetMasterEngine.calculateEstimate(request),
  };
};
