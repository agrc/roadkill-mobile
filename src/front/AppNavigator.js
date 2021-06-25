import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ChooseRoleScreen from './screens/ChooseRole';
import LoginScreen from './screens/Login';
import MainScreen from './screens/Main';
import * as Linking from 'expo-linking';
import * as Analytics from 'expo-firebase-analytics';
import * as SecureStorage from 'expo-secure-store';
import { v4 as uuid } from 'uuid';
import Constants from 'expo-constants';

const { Navigator, Screen } = createStackNavigator();
const prefix = Linking.createURL('/');

const HomeNavigator = () => (
  <Navigator headerMode="none">
    <Screen name="choose-role" component={ChooseRoleScreen} />
    <Screen name="login" component={LoginScreen} />
    <Screen name="main" component={MainScreen} />
  </Navigator>
);

const AppNavigator = () => {
  const navigationRef = React.useRef(null);
  const routeNameRef = React.useRef(null);

  React.useEffect(() => {
    const initAnalytics = async () => {
      if (Constants.appOwnership === 'expo') {
        const key = 'CLIENT_ID';
        let id = await SecureStorage.getItemAsync(key);

        if (!id) {
          id = uuid();

          SecureStorage.setItemAsync(key, id);
        }

        // needs to be called before any other analytics methods
        Analytics.setClientId(id);
      }

      if (__DEV__) {
        Analytics.setDebugModeEnabled(true);
      }
    };

    initAnalytics();
  }, []);

  const linking = { prefixes: [prefix] };
  const setInitialRouteName = () => (routeNameRef.current = navigationRef.current.getCurrentRoute().name);
  const updateRouteName = async () => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current.getCurrentRoute().name;

    if (previousRouteName !== currentRouteName) {
      await Analytics.setCurrentScreen(currentRouteName);
    }

    routeNameRef.current = currentRouteName;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={setInitialRouteName}
      onStateChange={updateRouteName}
      linking={linking}
    >
      <HomeNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
