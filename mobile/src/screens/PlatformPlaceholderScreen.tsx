import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useDrawerMenu } from '../navigation/DrawerMenuContext';

export const PlatformPlaceholderScreen = ({ route }: { route: { params: { title: string } } }) => {
  const openDrawer = useDrawerMenu();

  return (
    <View style={styles.root}>
      <AppHeader onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{route.params.title}</Text>
        <Text style={styles.subtitle}>Экран в разработке</Text>
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
});
