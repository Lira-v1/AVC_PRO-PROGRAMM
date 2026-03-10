import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { SmetMasterEngine } from '../smetmaster';

export const PlatformPlaceholderScreen = ({ route }: { route: { params: { title: string } } }) => {
  const smetmasterReady = useMemo(() => {
    if (route.params.title !== 'Сметмастер') {
      return false;
    }

    const probe = SmetMasterEngine.calculateEstimate({
      category: 'electrician',
      workType: 'diagnostics',
      tariff: 'economy',
    });

    return Boolean(probe);
  }, [route.params.title]);

  return (
    <View style={styles.root}>
      <AppHeader title={route.params.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{route.params.title}</Text>
        <Text style={styles.subtitle}>Экран в разработке</Text>
        {smetmasterReady ? <Text style={styles.caption}>Базовый движок Сметмастера подключён</Text> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#121a2f',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#6a768f',
  },
  caption: {
    marginTop: 10,
    fontSize: 13,
    color: '#0E5BF2',
  },
});
