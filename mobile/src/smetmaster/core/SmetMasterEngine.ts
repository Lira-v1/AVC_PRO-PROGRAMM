import { getEstimate } from '../repositories/estimateRepository';
import {
  EstimateCalculationInput,
  EstimateCalculationResult,
  TariffType,
} from '../types/SmetMasterTypes';

const TARIFF_MULTIPLIERS: Record<TariffType, number> = {
  economy: 1,
  comfort: 1.15,
  business: 1.3,
};

export class SmetMasterEngine {
  public static calculateEstimate({
    category,
    workType,
    tariff,
  }: EstimateCalculationInput): EstimateCalculationResult | null {
    const estimate = getEstimate(category, workType);
    if (!estimate) {
      return null;
    }

    const basePrice = estimate.base_price;
    const tariffMultiplier = TARIFF_MULTIPLIERS[tariff];
    const workPrice = Math.round(basePrice * tariffMultiplier);
    const masterVisitFee = workPrice < 10000 ? 2500 : 0;
    const finalPrice = workPrice + masterVisitFee;

    return {
      estimate,
      basePrice,
      tariffMultiplier,
      workPrice,
      masterVisitFee,
      finalPrice,
    };
  }
}
