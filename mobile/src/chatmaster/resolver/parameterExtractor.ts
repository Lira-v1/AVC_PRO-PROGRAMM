import { REQUEST_PATTERNS, UNIT_NORMALIZATION } from './requestPatterns';
import type { ExtractedParams } from './types';

const normalizeUnit = (unitRaw: string): string | undefined => {
  const normalizedKey = unitRaw.toLowerCase().replace(/\s+/g, '');
  return UNIT_NORMALIZATION[normalizedKey];
};

export const extractParams = (text: string): ExtractedParams => {
  const quantityMatch = text.match(REQUEST_PATTERNS.quantityWithUnit);

  if (!quantityMatch) {
    return {};
  }

  const quantity = Number(quantityMatch[1].replace(',', '.'));
  const unit = normalizeUnit(quantityMatch[2]);

  return {
    quantity: Number.isFinite(quantity) ? quantity : undefined,
    unit,
  };
};
