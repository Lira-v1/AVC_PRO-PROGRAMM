import {
  SmetMasterEngine,
  type EstimateCalculationInput,
  type EstimateCalculationResult,
  type TariffType,
} from '../../smetmaster';

type ResolvedWorkRequest = {
  category: string | null;
  workType: string | null;
};

const DEFAULT_TARIFF: TariffType = 'economy';

export type SmetMasterAdapterResult = {
  category: string | null;
  workType: string | null;
  request: EstimateCalculationInput | null;
  response: EstimateCalculationResult | null;
};

export const requestSmetMasterEstimate = (resolvedRequest: ResolvedWorkRequest): SmetMasterAdapterResult => {
  const { category, workType } = resolvedRequest;

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
