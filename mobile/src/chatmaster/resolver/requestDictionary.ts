import type { DictionaryEntry } from './types';

export const requestDictionary: DictionaryEntry[] = [
  {
    category: 'electrician',
    workType: 'socket_replacement',
    keywords: ['розетка', 'замена розетки', 'поменять розетку'],
  },
  {
    category: 'electrician',
    workType: 'socket_installation',
    keywords: ['установить розетку', 'монтаж розетки', 'новая розетка'],
  },
  {
    category: 'electrician',
    workType: 'cable_installation',
    keywords: ['кабель', 'прокладка кабеля', 'смонтировать кабель', 'протянуть провод'],
  },
  {
    category: 'electrician',
    workType: 'light_installation',
    keywords: ['светильник', 'лампа', 'лампочка', 'повесить лампу', 'установить светильник'],
  },
  {
    category: 'plumbing',
    workType: 'mixer_replacement',
    keywords: ['замена смесителя', 'поменять смеситель', 'течет кран'],
  },
  {
    category: 'finishing',
    workType: 'tile_installation',
    keywords: ['укладка плитки', 'положить плитку', 'кафель'],
  },
  {
    category: 'finishing',
    workType: 'wallpaper_removal',
    keywords: ['снять старые обои', 'демонтаж обоев', 'удалить обои'],
  },
];
