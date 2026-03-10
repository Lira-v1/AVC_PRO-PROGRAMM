import React, { useMemo, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type QuickAccessItem = {
  id: string;
  label: string;
  icon: string;
};

type QuickAccessRibbonProps = {
  items: QuickAccessItem[];
  onItemPress: (item: QuickAccessItem) => void;
};

export const QuickAccessRibbon = ({ items, onItemPress }: QuickAccessRibbonProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);

  const pages = useMemo(() => {
    const chunkSize = 3;
    return items.reduce<QuickAccessItem[][]>((acc, item, index) => {
      const pageIndex = Math.floor(index / chunkSize);
      if (!acc[pageIndex]) {
        acc[pageIndex] = [];
      }
      acc[pageIndex].push(item);
      return acc;
    }, []);
  }, [items]);

  const handlePagerScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pagerWidth) {
      return;
    }
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / pagerWidth);
    setCurrentPage(nextPage);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Быстрые действия</Text>

      <View
        style={styles.pagerViewport}
        onLayout={(event) => setPagerWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePagerScrollEnd}
          contentContainerStyle={styles.pagerContent}
        >
          {pages.map((page, pageIndex) => (
            <View
              key={`quick-page-${pageIndex}`}
              style={[styles.page, pagerWidth > 0 ? { width: pagerWidth } : undefined]}
            >
              {page.map((item) => (
                <Pressable key={item.id} style={styles.card} onPress={() => onItemPress(item)}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.icon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.label} numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.indicators}>
          {pages.map((_, pageIndex) => (
            <View
              key={`indicator-${pageIndex}`}
              style={[styles.indicator, pageIndex === currentPage && styles.indicatorActive]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5EAF4',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27334A',
    marginBottom: 10,
  },
  pagerViewport: {
    width: '100%',
  },
  pagerContent: {
    alignItems: 'stretch',
  },
  page: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    flex: 1,
    minHeight: 86,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: '#33415C',
    fontWeight: '500',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6CFDF',
  },
  indicatorActive: {
    width: 16,
    backgroundColor: '#0E5BF2',
  },
});
