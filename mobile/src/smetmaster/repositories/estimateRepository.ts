import { cleaningEstimates } from '../estimates/cleaning';
import { electricianEstimates } from '../estimates/electrician';
import { finishingEstimates } from '../estimates/finishing';
import { generalConstructionEstimates } from '../estimates/general_construction';
import { handymanEstimates } from '../estimates/handyman';
import { plumbingEstimates } from '../estimates/plumbing';
import { welderEstimates } from '../estimates/welder';
import { EstimateCatalogStats, EstimateRecord } from '../types/SmetMasterTypes';

const CATEGORY_ALIASES: Record<string, string> = {
  plumber: 'plumbing',
  plumbing_service: 'plumbing',
};

const ESTIMATE_CATALOG: Record<string, EstimateRecord[]> = {
  electrician: electricianEstimates,
  plumbing: plumbingEstimates,
  welder: welderEstimates,
  handyman: handymanEstimates,
  cleaning: cleaningEstimates,
  finishing: finishingEstimates,
  general_construction: generalConstructionEstimates,
};

const normalizeCategory = (category: string): string =>
  CATEGORY_ALIASES[category] ?? category;

const getCategoryEstimates = (category: string): EstimateRecord[] => {
  const normalizedCategory = normalizeCategory(category);
  return ESTIMATE_CATALOG[normalizedCategory] ?? [];
};

export const getEstimate = (category: string, workType: string): EstimateRecord | null => {
  if (!category || !workType) {
    return null;
  }

  return getCategoryEstimates(category).find((estimate) => estimate.work_type === workType) ?? null;
};

export const getEstimatesByCategory = (category: string): EstimateRecord[] => {
  if (!category) {
    return [];
  }

  return [...getCategoryEstimates(category)];
};

export const getAllEstimates = (): EstimateRecord[] =>
  Object.values(ESTIMATE_CATALOG).flatMap((estimates) => estimates);

export const getAvailableCategories = (): string[] => Object.keys(ESTIMATE_CATALOG);

export const getAvailableWorkTypes = (category: string): string[] =>
  getCategoryEstimates(category).map((estimate) => estimate.work_type);

export const getEstimateStats = (): EstimateCatalogStats => {
  const categories = getAvailableCategories();
  const allEstimates = getAllEstimates();
  const workTypes = new Set(allEstimates.map((estimate) => estimate.work_type));

  return {
    categoriesCount: categories.length,
    estimatesCount: allEstimates.length,
    workTypesCount: workTypes.size,
  };
};
