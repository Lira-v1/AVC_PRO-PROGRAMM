export const toneRules = {
  concise: 'Говорить коротко и по делу.',
  maxSentences: 3,
  simpleLanguage: 'Использовать простой и понятный язык.',
  avoidSystemTerms: 'Не использовать внутренние технические термины системы.',
  avoidOfficialStyle: 'Избегать канцелярского и бюрократического стиля.',
  avoidLongParagraphs: 'Не писать длинные абзацы.',
  assistantPersona: 'Звучать как живой сервисный ассистент.',
} as const;

export type ToneRules = typeof toneRules;
