import React from 'react';
import { Button, Divider, Layout, TopNavigation } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native';
import propTypes from 'prop-types';

export default function ChooseRoleScreen({ navigation }) {
  const test = () => {
    navigation.navigate('login');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TopNavigation title="WVC" alignment="center" />
      <Divider />
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Button onPress={test}>test</Button>
      </Layout>
    </SafeAreaView>
  );
}

ChooseRoleScreen.propTypes = {
  navigation: propTypes.object,
};
