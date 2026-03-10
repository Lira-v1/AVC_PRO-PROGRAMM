export const synonymMap: Record<string, string[]> = {
  lighting: ['лампа', 'лампочка', 'свет', 'светильник', 'люстра', 'спот'],
  socket: ['розетка', 'розетку', 'розетки', 'подрозетник'],
  cable: ['кабель', 'провод', 'проводка'],
  plumbing_faucet: ['кран', 'смеситель'],
  tile: ['плитка', 'кафель'],
  wallpaper: ['обои', 'обоев', 'обоями'],
  pipe: ['труба', 'трубы'],
  toilet: ['унитаз', 'унитаза'],
  channel: ['канализация', 'канализацию'],
};

export const synonymToCanonicalToken: Record<string, string> = Object.entries(synonymMap).reduce(
  (acc, [group, words]) => {
    words.forEach((word) => {
      acc[word] = group;
    });

    return acc;
  },
  {} as Record<string, string>,
);
