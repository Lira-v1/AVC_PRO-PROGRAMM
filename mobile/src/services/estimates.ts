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

type EstimateCalculationInput = {
  category: string;
  workType: string;
  tariff: TariffType;
};

const TARIFF_MULTIPLIERS: Record<TariffType, number> = {
  economy: 1,
  comfort: 1.15,
  business: 1.3,
};

const ESTIMATE_BLUEPRINTS: Array<Omit<EstimateRecord, 'base_price'>> = [
  {
    estimate_id: 'est-electrician-repair',
    category: 'electrician',
    work_type: 'repair',
    title: 'Ремонт электрики (базовая смета)',
    items: [
      { name: 'Диагностика неисправности', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'Локальный ремонт линии', unit: 'услуга', price: 3500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-electrician-replacement',
    category: 'electrician',
    work_type: 'replacement',
    title: 'Замена электроточки',
    items: [
      { name: 'Демонтаж розетки', unit: 'шт', price: 500, quantity: 1 },
      { name: 'Монтаж новой розетки', unit: 'шт', price: 3000, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-plumber-repair',
    category: 'plumber',
    work_type: 'repair',
    title: 'Ремонт сантехники',
    items: [
      { name: 'Диагностика узла', unit: 'услуга', price: 1500, quantity: 1 },
      { name: 'Ремонт соединения/узла', unit: 'услуга', price: 4500, quantity: 1 },
    ],
  },
  {
    estimate_id: 'est-plumber-installation',
    category: 'plumber',
    work_type: 'installation',
    title: 'Монтаж сантехнического прибора',
    items: [
      { name: 'Подготовка точки подключения', unit: 'услуга', price: 2500, quantity: 1 },
      { name: 'Монтаж и подключение', unit: 'услуга', price: 7000, quantity: 1 },
    ],
  },
];

export const estimates: EstimateRecord[] = ESTIMATE_BLUEPRINTS.map((estimate) => {
  const base_price = estimate.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { ...estimate, base_price };
});

export const getEstimate = (category: string, workType: string): EstimateRecord | null =>
  estimates.find((estimate) => estimate.category === category && estimate.work_type === workType) ?? null;

export const calculateEstimatePrice = ({ category, workType, tariff }: EstimateCalculationInput) => {
  const estimate = getEstimate(category, workType);
  if (!estimate) {
    return null;
  }

  const workPrice = Math.round(estimate.base_price * TARIFF_MULTIPLIERS[tariff]);
  const masterVisitFee = workPrice < 10000 ? 2500 : 0;
  const finalPrice = workPrice + masterVisitFee;

  return {
    estimate,
    workPrice,
    masterVisitFee,
    finalPrice,
  };
};
