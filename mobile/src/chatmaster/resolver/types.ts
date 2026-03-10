export type WorkRequestResolverDebug = {
  matchType: 'exact' | 'fuzzy' | 'none';
  confidence: number;
  matchedWords: string[];
  normalizedText: string;
  selectedWorkType: string | null;
  exactMatch?: {
    workType: string;
    confidence: number;
    matchedWords: string[];
  } | null;
  fuzzyMatch?: {
    workType: string;
    confidence: number;
    matchedWords: string[];
    normalizedText: string;
  } | null;
};

export type WorkRequestResult = {
  category: string | null;
  workType: string | null;
  confidence: number;
  params?: Record<string, unknown>;
  debug?: WorkRequestResolverDebug;
};

export type DictionaryEntry = {
  category: string;
  workType: string;
  keywords: string[];
};

export type ExtractedParams = {
  quantity?: number;
  unit?: string;
};
