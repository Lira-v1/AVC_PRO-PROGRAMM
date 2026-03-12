import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  backLabel: string | null;
  isFullscreen: boolean;
  showGrid: boolean;
  scale: number;
  onBackPress?: () => void;
  onToggleFullscreen: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onCenterProject: () => void;
};

export const V2CanvasControls = ({
  backLabel,
  isFullscreen,
  showGrid,
  scale,
  onBackPress,
  onToggleFullscreen,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onCenterProject,
}: Props) => {
  return (
    <View style={styles.controlsRoot}>
      <View style={styles.zoomRow}>
        <Pressable style={styles.smallControlButton} onPress={onZoomOut}>
          <Text style={styles.buttonText}>−</Text>
        </Pressable>

        <Pressable style={styles.smallControlButton} onPress={onZoomIn}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>

        <Pressable style={styles.scaleBadge} onPress={onResetZoom}>
          <Text style={styles.buttonText}>100%</Text>
        </Pressable>

        <View style={styles.activeScaleBadge}>
          <Text style={styles.scaleChipText}>{Math.round(scale * 100)}%</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {backLabel && onBackPress ? (
          <Pressable style={styles.backButton} onPress={onBackPress}>
            <Text style={styles.buttonText}>{backLabel}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.actionButton} onPress={onToggleFullscreen}>
          <Text style={styles.buttonText}>{isFullscreen ? 'Свернуть' : 'Полный экран'}</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onToggleGrid}>
          <Text style={styles.buttonText}>{showGrid ? 'Скрыть сетку' : 'Показать сетку'}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onCenterProject}>
          <Text style={styles.buttonText}>Центр проекта</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsRoot: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 100,
    gap: 10,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3F2',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3F2',
  },
  smallControlButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  scaleBadge: {
    minWidth: 120,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  activeScaleBadge: {
    minWidth: 120,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  scaleChipText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
});
