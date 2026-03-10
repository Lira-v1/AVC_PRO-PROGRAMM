import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AppHeaderProps = {
  onMenuPress?: () => void;
  title?: string;
  isHome?: boolean;
};

export const AppHeader = ({ onMenuPress, title = 'MasterPro', isHome = false }: AppHeaderProps) => {
  const navigation = useNavigation<any>();
  const canGoBack = navigation.canGoBack();

  const onBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  };

  if (isHome) {
    return (
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
  }

  return (
    <View style={styles.header}>
      <View style={styles.leftArea}>
        {canGoBack ? (
          <Pressable onPress={onBackPress} style={styles.backButton} accessibilityLabel="Назад">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.screenTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );
};

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
    width: 44,
    height: 44,
  },
  leftArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#101623',
    lineHeight: 24,
  },
  screenTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#101623',
    textAlign: 'left',
  },
});
