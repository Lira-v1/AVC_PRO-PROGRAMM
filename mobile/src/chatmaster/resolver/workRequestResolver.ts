import { extractParams } from './parameterExtractor';
import { requestDictionary } from './requestDictionary';
import type { DictionaryEntry, WorkRequestResult } from './types';

const EMPTY_RESULT: WorkRequestResult = {
  category: null,
  workType: null,
  confidence: 0,
};

export class WorkRequestResolver {
  public resolveRequest(text: string): WorkRequestResult {
    const normalizedText = this.normalizeText(text);
    const bestMatch = this.findBestDictionaryMatch(normalizedText);

    if (!bestMatch) {
      return EMPTY_RESULT;
    }

    const extractedParams = extractParams(normalizedText);

    return {
      category: bestMatch.entry.category,
      workType: bestMatch.entry.workType,
      confidence: bestMatch.score / bestMatch.entry.keywords.length,
      params: Object.keys(extractedParams).length > 0 ? extractedParams : undefined,
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/м\.?п\.?/g, 'метров')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findBestDictionaryMatch(text: string): { entry: DictionaryEntry; score: number } | null {
    let bestMatch: { entry: DictionaryEntry; score: number } | null = null;

    for (const entry of requestDictionary) {
      const score = entry.keywords.reduce((total, keyword) => {
        return text.includes(keyword) ? total + 1 : total;
      }, 0);

      if (score === 0) {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { entry, score };
      }
    }

    return bestMatch;
  }
}
