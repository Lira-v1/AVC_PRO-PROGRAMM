import { matchFuzzyRequest } from './fuzzyRequestMatcher';
import { extractParams } from './parameterExtractor';
import { requestDictionary } from './requestDictionary';
import type { DictionaryEntry, WorkRequestResolverDebug, WorkRequestResult } from './types';

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
    exactMatch: null,
    fuzzyMatch: null,
  },
};

export class WorkRequestResolver {
  public resolveRequest(text: string): WorkRequestResult {
    const normalizedText = this.normalizeText(text);
    const exactMatch = this.findBestDictionaryMatch(normalizedText);
    const fuzzyMatch = matchFuzzyRequest(normalizedText, requestDictionary);

    const exactIsStrong = Boolean(exactMatch && exactMatch.confidence >= EXACT_CONFIDENCE_THRESHOLD);

    const useFuzzy =
      fuzzyMatch &&
      (!exactMatch || !exactIsStrong || fuzzyMatch.confidence > exactMatch.confidence);

    if (useFuzzy) {
      return this.createResult(
        fuzzyMatch.normalizedText,
        fuzzyMatch.entry,
        fuzzyMatch.confidence,
        'fuzzy',
        fuzzyMatch.matchedWords,
        this.buildDecisionTrace(normalizedText, exactMatch, fuzzyMatch),
      );
    }

    if (exactMatch) {
      return this.createResult(
        normalizedText,
        exactMatch.entry,
        exactMatch.confidence,
        'exact',
        exactMatch.matchedWords,
        this.buildDecisionTrace(normalizedText, exactMatch, fuzzyMatch),
      );
    }

    return {
      ...EMPTY_RESULT,
      debug: this.buildDecisionTrace(normalizedText, null, fuzzyMatch),
    };
  }

  private createResult(
    normalizedText: string,
    entry: DictionaryEntry,
    confidence: number,
    matchType: 'exact' | 'fuzzy',
    matchedWords: string[],
    trace: WorkRequestResolverDebug,
  ): WorkRequestResult {
    const extractedParams = extractParams(normalizedText);

    return {
      category: entry.category,
      workType: entry.workType,
      confidence,
      params: Object.keys(extractedParams).length > 0 ? extractedParams : undefined,
      debug: {
        ...trace,
        matchType,
        confidence,
        matchedWords,
        normalizedText,
        selectedWorkType: entry.workType,
      },
    };
  }

  private buildDecisionTrace(
    normalizedText: string,
    exactMatch: { entry: DictionaryEntry; confidence: number; matchedWords: string[] } | null,
    fuzzyMatch: { entry: DictionaryEntry; confidence: number; matchedWords: string[]; normalizedText: string } | null,
  ): WorkRequestResolverDebug {
    return {
      matchType: 'none',
      confidence: 0,
      matchedWords: [],
      normalizedText,
      selectedWorkType: null,
      exactMatch: exactMatch
        ? {
            workType: exactMatch.entry.workType,
            confidence: exactMatch.confidence,
            matchedWords: exactMatch.matchedWords,
          }
        : null,
      fuzzyMatch: fuzzyMatch
        ? {
            workType: fuzzyMatch.entry.workType,
            confidence: fuzzyMatch.confidence,
            matchedWords: fuzzyMatch.matchedWords,
            normalizedText: fuzzyMatch.normalizedText,
          }
        : null,
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
