import { synonymToCanonicalToken } from './synonymMap';
import { typoMap } from './typoMap';
import type { DictionaryEntry } from './types';

const TOKEN_SPLITTER = /[^а-яa-z0-9_]+/i;

const weakWords = new Set([
  'сделать',
  'нужно',
  'укладка',
  'поставить',
  'установить',
  'установка',
  'помочь',
  'смонтировать',
  'монтаж',
  'заменить',
  'замена',
  'поменять',
  'подключить',
  'повесить',
  'протянуть',
  'кинуть',
  'под',
  'и',
  'в',
  'на',
]);

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
};

const canonicalizeToken = (token: string, vocabulary: Set<string>): string => {
  if (typoMap[token]) {
    return typoMap[token];
  }

  const synonymToken = synonymToCanonicalToken[token];
  if (synonymToken) {
    return synonymToken;
  }

  if (token.length < 5 || vocabulary.has(token)) {
    return token;
  }

  let nearestToken = token;
  let nearestDistance = Number.POSITIVE_INFINITY;

  vocabulary.forEach((candidate) => {
    if (Math.abs(candidate.length - token.length) > 2) {
      return;
    }

    const distance = levenshteinDistance(token, candidate);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestToken = candidate;
    }
  });

  const maxDistance = token.length >= 8 ? 2 : 1;

  return nearestDistance <= maxDistance ? nearestToken : token;
};

const tokenize = (text: string): string[] =>
  text
    .split(TOKEN_SPLITTER)
    .map((token) => token.trim())
    .filter(Boolean);

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/м\.?п\.?/g, 'метров')
    .replace(/\s+/g, ' ')
    .trim();

export type FuzzyRequestMatch = {
  entry: DictionaryEntry;
  confidence: number;
  matchedWords: string[];
  normalizedText: string;
};

const buildVocabulary = (dictionary: DictionaryEntry[]): Set<string> => {
  const words = new Set<string>();

  dictionary.forEach((entry) => {
    entry.keywords.forEach((keyword) => {
      tokenize(normalizeText(keyword)).forEach((token) => words.add(token));
    });
  });

  Object.keys(synonymToCanonicalToken).forEach((token) => words.add(token));
  Object.values(synonymToCanonicalToken).forEach((group) => words.add(group));
  Object.keys(typoMap).forEach((token) => words.add(token));
  Object.values(typoMap).forEach((token) => words.add(token));

  return words;
};

export const matchFuzzyRequest = (text: string, dictionary: DictionaryEntry[]): FuzzyRequestMatch | null => {
  const normalizedText = normalizeText(text);
  const vocabulary = buildVocabulary(dictionary);
  const normalizedTokens = tokenize(normalizedText).map((token) => {
    const typoFixed = canonicalizeToken(token, vocabulary);
    return synonymToCanonicalToken[typoFixed] ?? typoFixed;
  });
  const normalizedTokenSet = new Set(normalizedTokens);

  let bestMatch: FuzzyRequestMatch | null = null;

  dictionary.forEach((entry) => {
    let bestEntryScore = 0;
    const entryMatchedWords = new Set<string>();

    entry.keywords.forEach((keyword) => {
      const keywordTokens = tokenize(normalizeText(keyword)).map((token) => synonymToCanonicalToken[token] ?? token);

      const strongTokens = keywordTokens.filter((token) => !weakWords.has(token));
      const weakTokens = keywordTokens.filter((token) => weakWords.has(token));

      const strongMatched = strongTokens.filter((token) => normalizedTokenSet.has(token));
      const weakMatched = weakTokens.filter((token) => normalizedTokenSet.has(token));

      strongMatched.forEach((token) => entryMatchedWords.add(token));
      weakMatched.forEach((token) => entryMatchedWords.add(token));

      const maxScore = strongTokens.length + weakTokens.length * 0.35;
      const gotScore = strongMatched.length + weakMatched.length * 0.35;

      let keywordScore = maxScore > 0 ? gotScore / maxScore : 0;

      if (normalizedText.includes(normalizeText(keyword))) {
        keywordScore += 0.15;
      }

      if (strongMatched.length > 0 && weakMatched.length === 0 && weakTokens.length > 0) {
        keywordScore -= 0.05;
      }

      bestEntryScore = Math.max(bestEntryScore, Math.max(0, Math.min(keywordScore, 1)));
    });

    if (bestEntryScore < 0.3) {
      return;
    }

    const confidence = Math.min(0.8, 0.28 + bestEntryScore * 0.5);

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        entry,
        confidence,
        matchedWords: Array.from(entryMatchedWords),
        normalizedText: normalizedTokens.join(' '),
      };
    }
  });

  return bestMatch;
};
