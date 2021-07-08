import { useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootView({ children, showSpinner = false }) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme['background-basic-color-1'] }]}>
      {children}
      {showSpinner ? (
        <View style={[styles.spinner, { backgroundColor: theme['color-basic-transparent-600'] }]}>
          <ActivityIndicator color={theme['color-basic-1100']} size="large" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
RootView.propTypes = {
  children: propTypes.node,
  showSpinner: propTypes.bool,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  spinner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
