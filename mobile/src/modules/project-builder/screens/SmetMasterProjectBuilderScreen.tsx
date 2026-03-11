import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProjectCanvas } from '../components/ProjectCanvas';
import { useProjectBuilder } from '../hooks/useProjectBuilder';

type MainStackParamList = {
  Home: undefined;
  Services: undefined;
  Emergency: undefined;
  Estimate: undefined;
  Commercial: undefined;
  Maintenance: undefined;
  Vacancies: undefined;
  Orders: undefined;
  Shop: undefined;
  CreateRequest: undefined;
  Login: undefined;
  Registration: undefined;
  Placeholder: { title: string };
  ChatMaster: undefined;
};

type Props = NativeStackScreenProps<MainStackParamList, 'Estimate'>;

export const SmetMasterProjectBuilderScreen = ({ navigation }: Props) => {
  const { project, rooms, addRoom } = useProjectBuilder();

  return (
    <View style={styles.root}>
      <View style={styles.topPanel}>
        <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
          <Text style={styles.outlineButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Project Builder</Text>
        <Pressable style={styles.filledButton}>
          <Text style={styles.filledButtonText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.projectTitle}>{project.name}</Text>
        <Pressable style={styles.addRoomButton} onPress={addRoom}>
          <Text style={styles.addRoomButtonText}>Добавить комнату</Text>
        </Pressable>
      </View>

      <View style={styles.canvasContainer}>
        <ProjectCanvas rooms={rooms} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F5FA',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
  },
  topPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101623',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#BBC5DC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 66,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#2A3756',
    fontSize: 14,
    fontWeight: '600',
  },
  filledButton: {
    backgroundColor: '#3461D5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 66,
    alignItems: 'center',
  },
  filledButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectTitle: {
    fontSize: 16,
    color: '#2A3756',
    fontWeight: '600',
  },
  addRoomButton: {
    backgroundColor: '#1E8B57',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addRoomButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
  },
});
