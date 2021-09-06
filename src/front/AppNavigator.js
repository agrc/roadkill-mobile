import { createDrawerNavigator } from '@react-navigation/drawer';
import { HeaderBackButton } from '@react-navigation/elements';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Drawer, DrawerItem, IndexPath, useTheme } from '@ui-kitten/components';
import Constants from 'expo-constants';
import * as Analytics from 'expo-firebase-analytics';
import * as Linking from 'expo-linking';
import * as SecureStorage from 'expo-secure-store';
import * as Updates from 'expo-updates';
import propTypes from 'prop-types';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuid } from 'uuid';
import useAuth from './auth/context';
import config from './config';
import { getIcon } from './icons';
import ChooseTypeScreen from './screens/ChooseType';
import LoginScreen from './screens/Login';
import MainScreen from './screens/Main';
import MyReportsScreen from './screens/MyReports';
import NewUserScreen from './screens/NewUser';
import ProfileScreen from './screens/Profile';
import { forceUpdate, sendEmailToSupport } from './utilities';

const { Navigator, Screen } = createStackNavigator();
const prefix = Linking.createURL('/');

const AuthNavigator = () => {
  const { userType } = useAuth();

  return (
    <Navigator screenOptions={{ headerShown: false }} initialRouteName={userType ? 'login' : null}>
      <Screen name="choose-type" component={ChooseTypeScreen} />
      <Screen name="login" component={LoginScreen} />
      <Screen name="new-user" component={NewUserScreen} />
    </Navigator>
  );
};

const DrawerIcon = (props) => {
  const theme = useTheme();
  const iconSize = 30;

  const Icon = getIcon({
    pack: 'eva',
    name: props.name,
    size: iconSize,
    color: theme['color-basic-700'],
  });

  return <Icon />;
};
DrawerIcon.propTypes = {
  name: propTypes.string.isRequired,
};

const getDrawContent = ({ navigation, state, logOut }) => {
  const actions = {
    4: sendEmailToSupport,
    5: logOut,
    6: forceUpdate,
  };
  const onSelect = (index) => {
    if (actions[index]) {
      return actions[index]();
    }

    navigation.navigate(state.routeNames[index.row]);
  };

  let versionTitle = `App version: ${Constants.manifest.version} (${Constants.manifest?.ios?.buildNumber})`;
  if (Updates.releaseChannel !== config.RELEASE_CHANNELS.production) {
    versionTitle += ` - ${__DEV__ ? 'dev' : Updates.releaseChannel}`;
  }

  return (
    <SafeAreaView>
      <Drawer selectedIndex={state.index === 0 ? null : new IndexPath(state.index)} onSelect={onSelect}>
        <DrawerItem title="Main" style={{ display: 'none' }} />
        <DrawerItem title="My Reports" accessoryLeft={() => <DrawerIcon name="list" />} />
        <DrawerItem title="Profile" accessoryLeft={() => <DrawerIcon name="person" />} />
        <DrawerItem title="Contact" accessoryLeft={() => <DrawerIcon name="email" />} />
        <DrawerItem title="Logout" accessoryLeft={() => <DrawerIcon name="log-out" />} />
        <DrawerItem title={versionTitle} accessoryLeft={() => <DrawerIcon name="info" />} />
      </Drawer>
    </SafeAreaView>
  );
};

const MainNavigator = () => {
  const { Navigator, Screen } = createDrawerNavigator();
  const navigation = useNavigation();
  const GoBack = () => <HeaderBackButton onPress={() => navigation.goBack()} />;
  const getHeaderIcon = (name) => <DrawerIcon name={name} style={{ marginRight: 10 }} />;
  const { logOut } = useAuth();

  return (
    <Navigator
      drawerContent={(args) => getDrawContent({ ...args, logOut })}
      screenOptions={{ swipeEnabled: false, headerLeft: GoBack }}
    >
      <Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
      <Screen name="My Reports" component={MyReportsScreen} options={{ headerRight: () => getHeaderIcon('list') }} />
      <Screen name="Profile" component={ProfileScreen} options={{ headerRight: () => getHeaderIcon('person') }} />
    </Navigator>
  );
};

const AppNavigator = () => {
  const navigationRef = React.useRef(null);
  const routeNameRef = React.useRef(null);
  const { authInfo } = useAuth();

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

  const linking = { prefixes: [prefix], config: { screens: { login: 'oauthredirect' } } };
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
      {authInfo?.user && authInfo.registered ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
