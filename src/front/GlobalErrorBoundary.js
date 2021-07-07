import { Button, Layout, Text } from '@ui-kitten/components';
import * as SecureStore from 'expo-secure-store';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet } from 'react-native';
import RNRestart from 'react-native-restart';
import { SafeAreaView } from 'react-native-safe-area-context';
import { USER_STORE_KEY, USER_TYPE_KEY } from './auth/context';

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // send to back end error log
    fetch('TODO??', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error, info }),
    });
  }

  async restartApp() {
    await SecureStore.deleteItemAsync(USER_STORE_KEY);
    await SecureStore.deleteItemAsync(USER_TYPE_KEY);

    RNRestart.restartApp();
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <Layout>
            <Text>Something went wrong!</Text>
            <Text>{JSON.stringify(this.state.error, null, 2)}</Text>
            <Button onPress={this.restartApp}>Restart</Button>
          </Layout>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
GlobalErrorBoundary.propTypes = {
  children: propTypes.node,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  layout: { flex: 1, justifyContent: 'space-around', alignItems: 'center' },
});
