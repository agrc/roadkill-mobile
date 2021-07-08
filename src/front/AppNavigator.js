import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Constants from 'expo-constants';
import * as Analytics from 'expo-firebase-analytics';
import * as Linking from 'expo-linking';
import * as SecureStorage from 'expo-secure-store';
import React from 'react';
import { v4 as uuid } from 'uuid';
import useAuth from './auth/context';
import ChooseTypeScreen from './screens/ChooseType';
import LoginScreen from './screens/Login';
import MainScreen from './screens/Main';

const { Navigator, Screen } = createStackNavigator();
const prefix = Linking.createURL('/');

const MainNavigator = () => {
  const { authInfo, userType } = useAuth();

  return (
    <Navigator headerMode="none" initialRouteName={!authInfo && userType ? 'login' : null}>
      {authInfo?.registered ? (
        <Screen name="main" component={MainScreen} />
      ) : (
        <>
          <Screen name="choose-type" component={ChooseTypeScreen} />
          <Screen name="login" component={LoginScreen} />
        </>
      )}
    </Navigator>
  );
};

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
      <MainNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
