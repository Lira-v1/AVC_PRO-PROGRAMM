import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { SmetMasterEngine } from '../smetmaster';
import { getAllEstimates } from '../smetmaster/repositories/estimateRepository';

export const PlatformPlaceholderScreen = ({ route }: { route: { params: { title: string } } }) => {
  const [developerMode, setDeveloperMode] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [expandedEstimates, setExpandedEstimates] = useState<Record<string, boolean>>({});

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

  const allEstimates = useMemo(() => getAllEstimates(), []);

  const categoriesCount = useMemo(
    () => new Set(allEstimates.map((estimate) => estimate.category)).size,
    [allEstimates],
  );

  const operationsCount = useMemo(
    () => allEstimates.reduce((acc, estimate) => acc + estimate.items.length, 0),
    [allEstimates],
  );

  const estimatesByCategory = useMemo(() => {
    return allEstimates.reduce<Record<string, typeof allEstimates>>((acc, estimate) => {
      if (!acc[estimate.category]) {
        acc[estimate.category] = [];
      }

      acc[estimate.category].push(estimate);
      return acc;
    }, {});
  }, [allEstimates]);

  const handlePasswordSubmit = () => {
    if (password === '123') {
      setDeveloperMode(true);
      setPasswordVisible(false);
      setPassword('');
      setError('');
      return;
    }

    setError('Неверный пароль');
  };

  const handleExitDeveloperMode = () => {
    setDeveloperMode(false);
    setPasswordVisible(false);
    setPassword('');
    setError('');
    setExpandedEstimates({});
  };

  const toggleEstimate = (estimateId: string) => {
    setExpandedEstimates((prevState) => ({
      ...prevState,
      [estimateId]: !prevState[estimateId],
    }));
  };

  const renderDefaultState = () => (
    <View style={styles.centeredBlock}>
      <Text style={styles.title}>{route.params.title}</Text>
      <Text style={styles.subtitle}>Экран в разработке</Text>
      {smetmasterReady ? <Text style={styles.caption}>Базовый движок Сметмастера подключён</Text> : null}

      {route.params.title === 'Сметмастер' ? (
        <View style={styles.developerAccessCard}>
          <Pressable style={styles.primaryButton} onPress={() => setPasswordVisible(true)}>
            <Text style={styles.primaryButtonLabel}>Режим разработчика</Text>
          </Pressable>

          {passwordVisible ? (
            <View style={styles.passwordWrapper}>
              <Text style={styles.passwordLabel}>Введите пароль</Text>
              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) {
                    setError('');
                  }
                }}
                placeholder="Пароль"
                placeholderTextColor="#909bb4"
                secureTextEntry
                style={styles.passwordInput}
              />
              <Pressable style={styles.secondaryButton} onPress={handlePasswordSubmit}>
                <Text style={styles.secondaryButtonLabel}>Войти</Text>
              </Pressable>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderDeveloperMode = () => (
    <View style={styles.developerContainer}>
      <Text style={styles.developerTitle}>СМЕТМАСТЕР — РЕЖИМ РАЗРАБОТЧИКА</Text>

      <View style={styles.statsCard}>
        <Text style={styles.statsLine}>Категорий: {categoriesCount}</Text>
        <Text style={styles.statsLine}>Смет: {allEstimates.length}</Text>
        <Text style={styles.statsLine}>Операций: {operationsCount}</Text>
      </View>

      {Object.entries(estimatesByCategory).map(([category, estimates]) => (
        <View key={category} style={styles.categoryBlock}>
          <Text style={styles.categoryTitle}>Категория: {category}</Text>
          {estimates.map((estimate) => {
            const expanded = Boolean(expandedEstimates[estimate.estimate_id]);

            return (
              <View key={estimate.estimate_id} style={styles.estimateCard}>
                <Text style={styles.estimateLine}>work_type: {estimate.work_type}</Text>
                <Text style={styles.estimateLine}>title: {estimate.title}</Text>
                <Text style={styles.estimateLine}>base_price: {estimate.base_price}</Text>

                <Pressable style={styles.secondaryButton} onPress={() => toggleEstimate(estimate.estimate_id)}>
                  <Text style={styles.secondaryButtonLabel}>
                    {expanded ? 'Скрыть операции' : 'Показать операции'}
                  </Text>
                </Pressable>

                {expanded ? (
                  <View style={styles.itemsBlock}>
                    {estimate.items.map((item, index) => (
                      <Text key={`${estimate.estimate_id}-${item.name}-${index}`} style={styles.itemLine}>
                        - {item.name} | {item.unit} | {item.price} x {item.quantity}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      <Pressable style={styles.exitButton} onPress={handleExitDeveloperMode}>
        <Text style={styles.exitButtonLabel}>Выйти из режима разработчика</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader title={route.params.title} />
      <ScrollView contentContainerStyle={styles.content}>
        {developerMode ? renderDeveloperMode() : renderDefaultState()}
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
  },
  centeredBlock: {
    flexGrow: 1,
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
  developerAccessCard: {
    width: '100%',
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#DFE5F2',
    maxWidth: 400,
  },
  passwordWrapper: {
    marginTop: 12,
  },
  passwordLabel: {
    fontSize: 14,
    color: '#1D2942',
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#C6D0E3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFD',
    color: '#121A2F',
  },
  errorText: {
    marginTop: 8,
    color: '#D92D20',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#0E5BF2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#E9F0FF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: '#0E5BF2',
    fontWeight: '600',
    fontSize: 14,
  },
  developerContainer: {
    gap: 12,
  },
  developerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#101A33',
  },
  statsCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE5F2',
    padding: 12,
  },
  statsLine: {
    fontSize: 14,
    color: '#1D2942',
    marginBottom: 4,
  },
  categoryBlock: {
    marginTop: 6,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2540',
    marginBottom: 8,
  },
  estimateCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE5F2',
    padding: 12,
    marginBottom: 10,
  },
  estimateLine: {
    fontSize: 14,
    color: '#2B3652',
    marginBottom: 4,
  },
  itemsBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6EBF5',
    gap: 6,
  },
  itemLine: {
    fontSize: 13,
    color: '#3D4B6B',
  },
  exitButton: {
    marginTop: 8,
    backgroundColor: '#1D2942',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  exitButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
