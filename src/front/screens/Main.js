import React from 'react';
import { Divider, Layout, Text, TopNavigation } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native';
import propTypes from 'prop-types';

export default function MainScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation title="WVC" alignment="center" />
      <Divider />
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Map</Text>
      </Layout>
    </SafeAreaView>
  );
}

MainScreen.propTypes = {
  navigation: propTypes.object,
};
