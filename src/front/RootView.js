import { useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Spinner from './components/Spinner';

export default function RootView({ children, showSpinner = false, spinnerMessage, style }) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme['background-basic-color-1'] }, style]}>
      {children}
      <Spinner show={showSpinner} message={spinnerMessage} />
    </SafeAreaView>
  );
}
RootView.propTypes = {
  children: propTypes.node,
  showSpinner: propTypes.bool,
  spinnerMessage: propTypes.string,
  style: propTypes.object,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
