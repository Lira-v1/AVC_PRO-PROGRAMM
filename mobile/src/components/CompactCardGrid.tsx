import React, { useMemo } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

type GridItem = {
  id: string;
  title: string;
  image?: ImageSourcePropType;
};

type CompactCardGridProps<T extends GridItem> = {
  items: T[];
  onItemPress: (item: T) => void;
};

const COLUMNS_COUNT = 3;

const buildRows = <T extends GridItem,>(items: T[]) => {
  const rows: T[][] = [];

  for (let i = 0; i < items.length; i += COLUMNS_COUNT) {
    rows.push(items.slice(i, i + COLUMNS_COUNT));
  }

  return rows;
};

export const CompactCardGrid = <T extends GridItem,>({ items, onItemPress }: CompactCardGridProps<T>) => {
  const rows = useMemo(() => buildRows(items), [items]);

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => {
        const isLastRow = rowIndex === rows.length - 1;
        const isCenteredPair = isLastRow && row.length === 2;

        return (
          <View key={`row-${rowIndex}`} style={[styles.row, isCenteredPair && styles.centeredRow]}>
            {row.map((item) => (
              <Pressable key={item.id} style={[styles.card, item.image && styles.imageCard]} onPress={() => onItemPress(item)}>
                {item.image ? (
                  <ImageBackground
                    source={item.image}
                    style={styles.cardImage}
                    imageStyle={styles.cardImageRadius}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <View style={styles.iconPlaceholder} />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    rowGap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  centeredRow: {
    justifyContent: 'center',
  },
  card: {
    width: '31.5%',
    minHeight: 72,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  cardImage: {
    flex: 1,
    width: '100%',
    minHeight: 72,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImageRadius: {
    borderRadius: 10,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  iconPlaceholder: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#EEF3FF',
    position: 'absolute',
    top: 6,
    right: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16213c',
    textAlign: 'center',
  },
  imageCardTitle: {
    paddingHorizontal: 4,
    color: '#0F1B33',
    textShadowColor: 'rgba(255, 255, 255, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
