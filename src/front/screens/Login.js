import { Button, Icon, Layout, Text, TopNavigation, TopNavigationAction, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import utahIdLogo from '../assets/logo-utahid.png';
import useAuth, { STATUS } from '../auth/context';
import config from '../config';
import RootView from '../RootView';

export default function LoginScreen({ navigation }) {
  const { logIn, status, userType } = useAuth();
  const showSpinner = status === STATUS.loading;
  const theme = useTheme();

  const BackIcon = (props) => <Icon {...props} name="arrow-back" />;
  const BackAction = () => <TopNavigationAction icon={BackIcon} onPress={() => navigation.navigate('choose-type')} />;
  const OauthButton = ({ children, providerName, logo }) => {
    const OauthLogo = () => <Image source={logo} />;
    const initLogIn = async () => {
      const { registered } = await logIn(providerName, userType);
      if (!registered) {
        navigation.navigate('new-user');
      }
    };

    return (
      <Button
        disabled={status === STATUS.loading}
        onPress={initLogIn}
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
    disabled: propTypes.bool,
    logo: propTypes.any,
    providerName: propTypes.string,
  };

  return (
    <RootView showSpinner={showSpinner}>
      <TopNavigation title="" alignment="center" accessoryLeft={BackAction} />
      <Layout style={styles.layout}>
        <Text category="h1">Welcome</Text>
        <Image
          source={{ uri: 'https://via.placeholder.com/300x220', width: 300, height: 220 }}
          style={[styles.image, { borderColor: theme['border-alternative-color-1'] }]}
        />
        <View>
          <OauthButton providerName={config.PROVIDER_NAMES.utahid} logo={utahIdLogo}>
            Continue with UtahID
          </OauthButton>
          {userType === config.USER_TYPES.public ? (
            <>
              <OauthButton providerName={config.PROVIDER_NAMES.facebook} logo={null}>
                Continue with Facebook
              </OauthButton>
              <OauthButton providerName={config.PROVIDER_NAMES.google} logo={null}>
                Continue with Google
              </OauthButton>
            </>
          ) : null}
        </View>
      </Layout>
    </RootView>
  );
}

LoginScreen.propTypes = {
  navigation: propTypes.object,
  route: propTypes.object,
};

const styles = StyleSheet.create({
  layout: { flex: 1, justifyContent: 'space-around', alignItems: 'center' },
  image: {
    borderRadius: 3,
    borderWidth: 1,
  },
  oauthButton: {
    marginBottom: 10,
  },
});
