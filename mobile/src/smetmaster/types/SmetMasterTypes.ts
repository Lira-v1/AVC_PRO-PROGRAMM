export type EstimateOperation = {
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

export type EstimateRecord = {
  estimate_id: string;
  category: string;
  work_type: string;
  title: string;
  items: EstimateOperation[];
  base_price: number;
};

export type TariffType = 'economy' | 'comfort' | 'business';

export type EstimateCalculationInput = {
  category: string;
  workType: string;
  tariff: TariffType;
};

export type EstimateCalculationResult = {
  estimate: EstimateRecord;
  basePrice: number;
  tariffMultiplier: number;
  workPrice: number;
  masterVisitFee: number;
  finalPrice: number;
};
