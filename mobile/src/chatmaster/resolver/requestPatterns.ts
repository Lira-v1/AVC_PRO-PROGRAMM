export const REQUEST_PATTERNS = {
  quantityWithUnit: /(\d+(?:[.,]\d+)?)\s*(метр(?:а|ов)?|м\.?п\.?|м\.?|шт(?:ук[аи])?)/i,
};

export const UNIT_NORMALIZATION: Record<string, string> = {
  'м': 'meter',
  'м.': 'meter',
  'м.п': 'meter',
  'м.п.': 'meter',
  метр: 'meter',
  метра: 'meter',
  метров: 'meter',
  шт: 'piece',
  штука: 'piece',
  штуки: 'piece',
  штук: 'piece',
};
