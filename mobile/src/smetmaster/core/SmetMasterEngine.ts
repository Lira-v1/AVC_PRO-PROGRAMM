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
    if (!category || !workType || !tariff) {
      return null;
    }

    const estimate = getEstimate(category, workType);
    if (!estimate || !Array.isArray(estimate.items) || estimate.items.length === 0) {
      return null;
    }

    const safeBasePrice = Number.isFinite(estimate.base_price)
      ? estimate.base_price
      : estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const tariffMultiplier = TARIFF_MULTIPLIERS[tariff];
    if (!tariffMultiplier) {
      return null;
    }

    const basePrice = Math.max(0, Math.round(safeBasePrice));
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
      breakdown: [
        { label: 'Базовая цена', value: basePrice },
        { label: 'Тариф', value: tariff },
        { label: 'Коэффициент тарифа', value: tariffMultiplier },
        { label: 'Стоимость работ', value: workPrice },
        { label: 'Выезд мастера', value: masterVisitFee },
        { label: 'Итого', value: finalPrice },
      ],
    };
  }
}
