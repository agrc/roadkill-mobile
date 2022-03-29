import { useTheme } from '@ui-kitten/components';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getIcon } from '../services/icons';

export default function AlertIcon() {
  const theme = useTheme();

  const Icon = getIcon({
    pack: 'font-awesome',
    name: 'circle',
    size: 12,
    color: theme['color-success-700'],
  });

  return (
    <View style={styles.alertIcon}>
      <Icon />
    </View>
  );
}

const styles = StyleSheet.create({
  alertIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
