import { electricianEstimates } from '../estimates/electrician';
import { EstimateRecord } from '../types/SmetMasterTypes';

const ESTIMATE_STORAGE: EstimateRecord[] = [...electricianEstimates];

export const getEstimate = (category: string, workType: string): EstimateRecord | null =>
  ESTIMATE_STORAGE.find((estimate) => estimate.category === category && estimate.work_type === workType) ?? null;

export const getAllEstimates = (): EstimateRecord[] => ESTIMATE_STORAGE;
