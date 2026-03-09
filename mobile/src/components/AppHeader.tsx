import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AppHeaderProps = {
  onMenuPress: () => void;
};

export const AppHeader = ({ onMenuPress }: AppHeaderProps) => (
  <View style={styles.header}>
    <Pressable onPress={onMenuPress} style={styles.menuButton} accessibilityLabel="Открыть меню">
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </Pressable>
    <Text style={styles.headerTitle}>MasterPro</Text>
    <View style={styles.headerRightSpacer} />
  </View>
);

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ebf2',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: '#222',
    marginVertical: 1.5,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#101623',
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
});
