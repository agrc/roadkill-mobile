import React from 'react';
import { Button, Divider, Layout, Text, TopNavigation } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import propTypes from 'prop-types';
import useAuth from '../auth';

export default function MainScreen({ navigation }) {
  const { logOut } = useAuth(navigation);
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
