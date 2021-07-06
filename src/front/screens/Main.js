import { Button, Divider, Layout, Text, TopNavigation } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '../auth/context';

export default function MainScreen() {
  const { logOut } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation title="WVC" alignment="center" />
      <Divider />
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Map</Text>
        <Button onPress={logOut}>log off</Button>
      </Layout>
    </SafeAreaView>
  );
}

MainScreen.propTypes = {
  navigation: propTypes.object,
};
