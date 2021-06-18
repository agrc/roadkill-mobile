import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ChoseRoleScreen from './screens/ChoseRole';
import LoginScreen from './screens/Login';
import MainScreen from './screens/Main';
import * as Linking from 'expo-linking';

const { Navigator, Screen } = createStackNavigator();
const prefix = Linking.createURL('/');

const HomeNavigator = () => (
  <Navigator headerMode="none">
    <Screen name="chose-role" component={ChoseRoleScreen} />
    <Screen name="login" component={LoginScreen} />
    <Screen name="main" component={MainScreen} />
  </Navigator>
);

const AppNavigator = () => {
  const linking = { prefixes: [prefix] };

  return (
    <NavigationContainer linking={linking}>
      <HomeNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
