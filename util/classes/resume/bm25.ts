import { STOP_WORDS } from './vocabulary.ts';

const TOKEN_ALIASES = new Map<string, string>([
  ['front-end', 'frontend'],
  ['full-stack', 'fullstack'],
  ['nextjs', 'next.js'],
  ['nodejs', 'node.js'],
  ['nestjs', 'nest.js'],
  ['reactjs', 'react'],
  ['wasm', 'webassembly'],
  ['postgres', 'postgresql'],
  ['k8s', 'kubernetes'],
]);

const BM25_STOP_WORDS = new Set([
  ...STOP_WORDS,
  'and',
  'are',
  'but',
  'can',
  'for',
  'from',
  'has',
  'have',
  'into',
  'its',
  'job',
  'not',
  'our',
  'role',
  'skills',
  'that',
  'the',
  'their',
  'this',
  'using',
  'we',
  'who',
  'will',
  'with',
  'work',
  'you',
  'your',
  'будет',
  'вам',
  'весь',
  'для',
  'его',
  'или',
  'как',
  'мы',
  'наш',
  'не',
  'нужен',
  'нужно',
  'опыт',
  'по',
  'под',
  'при',
  'про',
  'роль',
  'с',
  'со',
  'так',
  'то',
  'уже',
  'что',
  'это',
]);

export interface BM25Document {
  id: string;
  tokens: string[];
}

export class BM25 {
  static tokenize(value: unknown): string[] {
    const tokens =
      String(value || '')
        .toLowerCase()
        .match(/[\p{L}\p{N}#+.]+/gu) || [];
    return tokens
      .map((token) => token.replace(/^\.+|\.+$/g, ''))
      .map((token) => TOKEN_ALIASES.get(token) || token)
      .filter((token) => token.length > 1 && !BM25_STOP_WORDS.has(token));
  }

  static rankDocuments(
    documents: readonly BM25Document[],
    query: readonly string[],
  ): Map<string, number> {
    const queryTerms = [...new Set(query)];
    const documentFrequency = new Map<string, number>();
    for (const term of queryTerms) {
      documentFrequency.set(
        term,
        documents.reduce(
          (count, document) => count + (document.tokens.includes(term) ? 1 : 0),
          0,
        ),
      );
    }
    const averageLength =
      documents.reduce((sum, document) => sum + document.tokens.length, 0) /
      Math.max(1, documents.length);
    const k1 = 1.5;
    const b = 0.75;

    return new Map(
      documents.map((document) => {
        const frequencies = new Map<string, number>();
        for (const token of document.tokens) {
          frequencies.set(token, (frequencies.get(token) || 0) + 1);
        }
        let score = 0;
        for (const term of queryTerms) {
          const frequency = frequencies.get(term) || 0;
          if (!frequency) continue;
          const df = documentFrequency.get(term) || 0;
          const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
          const lengthRatio =
            document.tokens.length / Math.max(1, averageLength);
          score +=
            (idf * frequency * (k1 + 1)) /
            (frequency + k1 * (1 - b + b * lengthRatio));
        }
        return [document.id, score];
      }),
    );
  }

  static rankedIds(
    ids: readonly string[],
    scores: ReadonlyMap<string, number>,
    limit: number,
  ): string[] {
    if (!Number.isFinite(limit)) return [...ids];
    const positions = new Map(ids.map((id, index) => [id, index]));
    return [...ids]
      .sort(
        (a, b) =>
          (scores.get(b) || 0) - (scores.get(a) || 0) ||
          (positions.get(a) ?? 0) - (positions.get(b) ?? 0),
      )
      .slice(0, Math.max(0, limit));
  }
}
