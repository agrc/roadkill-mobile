import analytics from '@react-native-firebase/analytics';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Drawer, DrawerItem, IndexPath, useTheme } from '@ui-kitten/components';
import * as Linking from 'expo-linking';
import propTypes from 'prop-types';
import React from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '../auth/context';
import AboutScreen from '../screens/About';
import ChooseTypeScreen from '../screens/ChooseType';
import ImageScreen from '../screens/Image';
import MainScreen from '../screens/Main';
import MyReportsScreen from '../screens/MyReports';
import NewUserScreen from '../screens/NewUser';
import ProfileScreen from '../screens/Profile';
import ReportInfoScreen from '../screens/ReportInfo';
import RouteInfoScreen from '../screens/RouteInfo';
import config from '../services/config';
import { getIcon } from '../services/icons';
import t from '../services/localization';
import { useOfflineCache } from '../services/offline';
import { PADDING } from '../services/styles';
import { sendEmailToSupport } from '../services/utilities';
import AlertIcon from './AlertIcon';

const { Navigator, Screen } = createStackNavigator();
const prefix = Linking.createURL('/');

let StorybookUIRoot;
if (config.SHOW_STORYBOOK) {
  // don't ship this code in production
  StorybookUIRoot = require('../.storybook/index').default;
}

const AuthNavigator = () => {
  return (
    <Navigator screenOptions={{ headerShown: false }}>
      <Screen name="choose-type" component={ChooseTypeScreen} />
      <Screen name="new-user" component={NewUserScreen} />
      {config.SHOW_STORYBOOK ? (
        <Screen name="storybook" component={StorybookUIRoot} />
      ) : null}
    </Navigator>
  );
};

const DrawerIcon = ({ name, alertNumber }) => {
  const theme = useTheme();
  const iconSize = 30;

  const Icon = getIcon({
    pack: 'eva',
    name: name,
    size: iconSize,
    color: theme['color-basic-700'],
  });

  return (
    <View>
      <Icon />
      {alertNumber ? <AlertIcon number={alertNumber} /> : null}
    </View>
  );
};
DrawerIcon.propTypes = {
  name: propTypes.string.isRequired,
  alertNumber: propTypes.number,
};

const getDrawContent = ({ navigation, state, logOut, cachedSubmissionIds }) => {
  let openStorybook;
  if (config.SHOW_STORYBOOK) {
    openStorybook = () => navigation.navigate('Storybook');
  }
  const actions = {
    5: sendEmailToSupport,
    6: logOut,
    7: openStorybook,
  };
  const onSelect = (index) => {
    if (actions[index]) {
      return actions[index]();
    }

    navigation.navigate(state.routeNames[index.row]);
  };

  return (
    <SafeAreaView>
      <Drawer
        selectedIndex={state.index === 0 ? null : new IndexPath(state.index)}
        onSelect={onSelect}
      >
        <DrawerItem title="Main" style={{ display: 'none' }} />
        <DrawerItem
          title={t('screens.myReports.title')}
          accessoryLeft={() => (
            <DrawerIcon
              name="list"
              alertNumber={cachedSubmissionIds.length || null}
            />
          )}
        />
        <DrawerItem
          title={t('screens.profile.title')}
          accessoryLeft={() => <DrawerIcon name="person" />}
        />
        <DrawerItem
          title={t('screens.about.title')}
          accessoryLeft={() => <DrawerIcon name="info" />}
        />
        <DrawerItem
          title={t('contact')}
          accessoryLeft={() => <DrawerIcon name="email" />}
        />
        <DrawerItem
          title={t('logout')}
          accessoryLeft={() => <DrawerIcon name="log-out" />}
        />
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
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ paddingHorizontal: PADDING }}
    >
      <CloseIcon />
    </TouchableOpacity>
  );
};
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
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ paddingHorizontal: PADDING }}
    >
      <BackIcon />
    </TouchableOpacity>
  );
};
const ReportsNavigator = () => {
  const { Navigator, Screen } = createStackNavigator();

  return (
    <Navigator screenOptions={{ headerLeft: BackButton }}>
      <Screen
        name={t('screens.myReports.title')}
        component={MyReportsScreen}
        options={{ headerLeft: CloseButton }}
      />
      <Screen
        name={t('screens.reportInfo.title')}
        component={ReportInfoScreen}
      />
      <Screen
        name={t('screens.routeInfo.title')}
        component={RouteInfoScreen}
        options={{ title: t('screens.routeInfo.title') }}
      />
      <Screen name={t('image')} component={ImageScreen} />
    </Navigator>
  );
};

const MainNavigator = () => {
  const { Navigator, Screen } = createDrawerNavigator();
  const { logOut } = useAuth();
  const { cachedSubmissionIds } = useOfflineCache();

  return (
    <Navigator
      drawerContent={(args) =>
        getDrawContent({ ...args, logOut, cachedSubmissionIds })
      }
      screenOptions={{ swipeEnabled: false, headerLeft: CloseButton }}
    >
      <Screen
        name="Main"
        component={MainScreen}
        options={{ headerShown: false }}
      />
      <Screen
        name="Reports Navigator"
        component={ReportsNavigator}
        options={{ headerShown: false }}
      />
      <Screen name={t('screens.profile.title')} component={ProfileScreen} />
      <Screen name={t('screens.about.title')} component={AboutScreen} />
      {config.SHOW_STORYBOOK ? (
        <Screen name="Storybook" component={StorybookUIRoot} />
      ) : null}
    </Navigator>
  );
};

const AppNavigator = () => {
  const navigationRef = React.useRef(null);
  const routeNameRef = React.useRef(null);
  const { authInfo } = useAuth();

  const linking = {
    prefixes: [prefix],
    config: { screens: { login: 'oauthredirect' } },
  };
  const setInitialRouteName = () =>
    (routeNameRef.current = navigationRef.current.getCurrentRoute().name);
  const updateRouteName = async () => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current.getCurrentRoute().name;

    if (previousRouteName !== currentRouteName) {
      await analytics().logEvent('screen_view', {
        screen_name: currentRouteName,
      });
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
      {authInfo?.user && authInfo.registered ? (
        <MainNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
