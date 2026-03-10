import { matchFuzzyRequest } from './fuzzyRequestMatcher';
import { extractParams } from './parameterExtractor';
import { requestDictionary } from './requestDictionary';
import type { DictionaryEntry, WorkRequestResult } from './types';

const EXACT_CONFIDENCE_THRESHOLD = 0.65;

const EMPTY_RESULT: WorkRequestResult = {
  category: null,
  workType: null,
  confidence: 0,
  debug: {
    matchType: 'none',
    confidence: 0,
    matchedWords: [],
    normalizedText: '',
    selectedWorkType: null,
  },
};

export class WorkRequestResolver {
  public resolveRequest(text: string): WorkRequestResult {
    const normalizedText = this.normalizeText(text);
    const exactMatch = this.findBestDictionaryMatch(normalizedText);

    if (exactMatch && exactMatch.confidence >= EXACT_CONFIDENCE_THRESHOLD) {
      return this.createResult(normalizedText, exactMatch.entry, exactMatch.confidence, 'exact', exactMatch.matchedWords);
    }

    const fuzzyMatch = matchFuzzyRequest(normalizedText, requestDictionary);

    if (fuzzyMatch) {
      return this.createResult(
        fuzzyMatch.normalizedText,
        fuzzyMatch.entry,
        fuzzyMatch.confidence,
        'fuzzy',
        fuzzyMatch.matchedWords,
      );
    }

    if (exactMatch) {
      return this.createResult(normalizedText, exactMatch.entry, exactMatch.confidence, 'exact', exactMatch.matchedWords);
    }

    return {
      ...EMPTY_RESULT,
      debug: {
        matchType: 'none',
        confidence: 0,
        matchedWords: [],
        normalizedText,
        selectedWorkType: null,
      },
    };
  }

  private createResult(
    normalizedText: string,
    entry: DictionaryEntry,
    confidence: number,
    matchType: 'exact' | 'fuzzy',
    matchedWords: string[],
  ): WorkRequestResult {
    const extractedParams = extractParams(normalizedText);

    return {
      category: entry.category,
      workType: entry.workType,
      confidence,
      params: Object.keys(extractedParams).length > 0 ? extractedParams : undefined,
      debug: {
        matchType,
        confidence,
        matchedWords,
        normalizedText,
        selectedWorkType: entry.workType,
      },
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/м\.?п\.?/g, 'метров')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findBestDictionaryMatch(
    text: string,
  ): { entry: DictionaryEntry; score: number; confidence: number; matchedWords: string[] } | null {
    let bestMatch: { entry: DictionaryEntry; score: number; confidence: number; matchedWords: string[] } | null = null;

    for (const entry of requestDictionary) {
      const matchedWords = entry.keywords.filter((keyword) => text.includes(keyword));
      const phraseScore = matchedWords.length;
      const tokenScore = entry.keywords.reduce((total, keyword) => {
        return keyword
          .split(/\s+/)
          .filter((token) => token.length > 2)
          .reduce((sum, token) => (text.includes(token) ? sum + 0.35 : sum), total);
      }, 0);

      const score = phraseScore + tokenScore;

      if (score === 0) {
        continue;
      }

      const confidence = Math.min(0.95, score / (entry.keywords.length + 1));

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { entry, score, confidence, matchedWords };
      }
    }

    return bestMatch;
  }
}
