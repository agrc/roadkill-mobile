import { Button, Icon, Layout, Text, TopNavigation, TopNavigationAction, useTheme } from '@ui-kitten/components';
import Constants from 'expo-constants';
import propTypes from 'prop-types';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import utahIdLogo from '../assets/logo-utahid.png';
import useAuth, { STATUS } from '../auth';
import config from '../config';

export default function LoginScreen({
  route: {
    params: { role },
  },
  navigation,
}) {
  const { logIn, status } = useAuth();
  const showSpinner = status === STATUS.loading;
  const theme = useTheme();

  const BackIcon = (props) => <Icon {...props} name="arrow-back" />;
  const BackAction = () => <TopNavigationAction icon={BackIcon} onPress={() => navigation.goBack()} />;
  const OauthButton = ({ children, onPress, disabled, logo }) => {
    const OauthLogo = () => <Image source={logo} />;

    return (
      <Button
        disabled={disabled}
        onPress={onPress}
        accessoryLeft={logo && OauthLogo}
        status="info"
        appearance="outline"
        style={styles.oauthButton}
      >
        {children}
      </Button>
    );
  };
  OauthButton.propTypes = {
    children: propTypes.string,
    onPress: propTypes.func,
    disabled: propTypes.bool,
    logo: propTypes.any,
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme['background-basic-color-1'] }]}>
      {Constants.platform.ios ? <TopNavigation title="" alignment="center" accessoryLeft={BackAction} /> : null}
      <Layout style={styles.layout}>
        <Text category="h1">Welcome</Text>
        <Image
          source={{ uri: 'https://via.placeholder.com/300x220', width: 300, height: 220 }}
          style={[styles.image, { borderColor: theme['border-alternative-color-1'] }]}
        />
        <View>
          <OauthButton disabled={status === STATUS.loading} onPress={logIn} logo={utahIdLogo}>
            Continue with UtahID
          </OauthButton>
          {role === config.ROLES.public ? (
            <>
              <OauthButton disabled={false} onPress={() => {}} logo={null}>
                Continue with Facebook
              </OauthButton>
              <OauthButton disabled={false} onPress={() => {}} logo={null}>
                Continue with Google
              </OauthButton>
            </>
          ) : null}
        </View>
      </Layout>
      {showSpinner ? (
        <View style={[styles.spinner, { backgroundColor: theme['color-basic-transparent-600'] }]}>
          <ActivityIndicator color={theme['color-basic-1100']} size="large" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

LoginScreen.propTypes = {
  navigation: propTypes.object,
  route: propTypes.object,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  layout: { flex: 1, justifyContent: 'space-around', alignItems: 'center' },
  image: {
    borderRadius: 3,
    borderWidth: 1,
  },
  oauthButton: {
    marginBottom: 10,
  },
  spinner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
