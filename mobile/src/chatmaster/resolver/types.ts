export type WorkRequestResult = {
  category: string | null;
  workType: string | null;
  confidence: number;
  params?: Record<string, unknown>;
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
