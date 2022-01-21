import { createDrawerNavigator } from '@react-navigation/drawer';
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
import { View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuid } from 'uuid';
import useAuth from '../auth/context';
import ChooseTypeScreen from '../screens/ChooseType';
import MainScreen from '../screens/Main';
import MyReportsScreen from '../screens/MyReports';
import NewUserScreen from '../screens/NewUser';
import ProfileScreen from '../screens/Profile';
import ReportInfoScreen from '../screens/ReportInfo';
import config from '../services/config';
import { getIcon } from '../services/icons';
import { PADDING } from '../services/styles';
import { forceUpdate, getReleaseChannelBranch, sendEmailToSupport } from '../services/utilities';

const { Navigator, Screen } = createStackNavigator();
const prefix = Linking.createURL('/');

let StorybookUIRoot;
if (config.SHOW_STORYBOOK) {
  // don't ship this code in production
  StorybookUIRoot = require('../storybook').default;
}

const AuthNavigator = () => {
  return (
    <Navigator screenOptions={{ headerShown: false }}>
      <Screen name="choose-type" component={ChooseTypeScreen} />
      <Screen name="new-user" component={NewUserScreen} />
      {config.SHOW_STORYBOOK ? <Screen name="storybook" component={StorybookUIRoot} /> : null}
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

  return (
    <View style={{ paddingRight: PADDING }}>
      <Icon />
    </View>
  );
};
DrawerIcon.propTypes = {
  name: propTypes.string.isRequired,
};

const getDrawContent = ({ navigation, state, logOut }) => {
  let openStorybook;
  if (config.SHOW_STORYBOOK) {
    openStorybook = () => navigation.navigate('Storybook');
  }
  const actions = {
    4: sendEmailToSupport,
    5: logOut,
    6: forceUpdate,
    7: openStorybook,
  };
  const onSelect = (index) => {
    if (actions[index]) {
      return actions[index]();
    }

    navigation.navigate(state.routeNames[index.row]);
  };

  let versionTitle = `App version: ${Constants.manifest.version} (${Constants.manifest?.ios?.buildNumber})`;
  if (getReleaseChannelBranch(Updates.releaseChannel) !== config.RELEASE_BRANCHES.production) {
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
        {config.SHOW_STORYBOOK ? <DrawerItem title="Storybook" /> : null}
      </Drawer>
    </SafeAreaView>
  );
};

const CloseButton = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const CloseIcon = getIcon({
    pack: 'material-community',
    name: 'close-circle-outline',
    size: 30,
    color: theme['color-basic-700'],
  });

  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: PADDING }}>
      <CloseIcon />
    </TouchableOpacity>
  );
};
const getHeaderIcon = (name) => <DrawerIcon name={name} style={{ marginRight: 10 }} />;
const BackButton = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const BackIcon = getIcon({
    pack: 'font-awesome-5',
    name: 'chevron-left',
    size: 30,
    color: theme['color-basic-700'],
  });

  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: PADDING }}>
      <BackIcon />
    </TouchableOpacity>
  );
};
const ReportsNavigator = () => {
  const { Navigator, Screen } = createStackNavigator();

  return (
    <Navigator screenOptions={{ headerLeft: BackButton }}>
      <Screen
        name="My Reports"
        component={MyReportsScreen}
        options={{ headerLeft: CloseButton, headerRight: () => getHeaderIcon('list') }}
      />
      <Screen name="Report Info" component={ReportInfoScreen} options={{ headerRight: () => getHeaderIcon('info') }} />
    </Navigator>
  );
};

const MainNavigator = () => {
  const { Navigator, Screen } = createDrawerNavigator();
  const { logOut } = useAuth();

  return (
    <Navigator
      drawerContent={(args) => getDrawContent({ ...args, logOut })}
      screenOptions={{ swipeEnabled: false, headerLeft: CloseButton }}
    >
      <Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
      <Screen name="Reports Navigator" component={ReportsNavigator} options={{ headerShown: false }} />
      <Screen name="Profile" component={ProfileScreen} options={{ headerRight: () => getHeaderIcon('person') }} />
      {config.SHOW_STORYBOOK ? <Screen name="Storybook" component={StorybookUIRoot} /> : null}
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
      await Analytics.logEvent('screen_view', { screen_name: currentRouteName });
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
