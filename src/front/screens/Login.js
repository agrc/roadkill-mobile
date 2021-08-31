import { Button, Icon, Layout, Text, TopNavigation, TopNavigationAction, useTheme } from '@ui-kitten/components';
import Constants from 'expo-constants';
import propTypes from 'prop-types';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import facebookBtnDisabled from '../assets/facebook/btn_light_disabled.png';
import facebookBtn from '../assets/facebook/btn_light_normal.png';
import facebookBtnPressed from '../assets/facebook/btn_light_pressed.png';
import googleBtnDisabled from '../assets/google/btn_google_signin_light_disabled_web.png';
import googleBtn from '../assets/google/btn_google_signin_light_normal_web.png';
import googleBtnPressed from '../assets/google/btn_google_signin_light_pressed_web.png';
import utahIdLogo from '../assets/logo-utahid.png';
import useAuth, { STATUS } from '../auth/context';
import config from '../config';
import RootView from '../RootView';

export default function LoginScreen({ navigation }) {
  const { logIn, status, userType } = useAuth();
  const showSpinner = status === STATUS.loading;
  const theme = useTheme();

  const initLogIn = async (providerName) => {
    const { success, registered } = await logIn(providerName);
    if (!success) {
      return;
    }
    if (!registered) {
      navigation.navigate('new-user');
    }
  };
  const BackIcon = (props) => <Icon {...props} name="arrow-back" />;
  const BackAction = () => <TopNavigationAction icon={BackIcon} onPress={() => navigation.navigate('choose-type')} />;

  const UtahIdLogoImage = () => <Image source={utahIdLogo} resizeMode="contain" />;
  const SocialButton = ({ providerName, normalImage, disabledImage, pressedImage }) => {
    const [pressed, setPressed] = React.useState(false);
    return (
      <Pressable
        onPress={() => initLogIn(providerName)}
        disabled={showSpinner}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessible={true}
        accessibilityLabel={`sign in with ${providerName}`}
        style={styles.oauthButton}
      >
        <Image source={showSpinner ? disabledImage : pressed ? pressedImage : normalImage} style={styles.socialImage} />
      </Pressable>
    );
  };
  SocialButton.propTypes = {
    providerName: propTypes.string.isRequired,
    normalImage: propTypes.node.isRequired,
    disabledImage: propTypes.node.isRequired,
    pressedImage: propTypes.node.isRequired,
  };
  console.log('Constants.manifest.releaseChannel', Constants.manifest.releaseChannel);

  return (
    <RootView showSpinner={showSpinner}>
      <TopNavigation title="" alignment="center" accessoryLeft={BackAction} />
      <Layout style={styles.layout}>
        <Text category="h1">Welcome</Text>
        <Image
          source={{ uri: 'https://via.placeholder.com/300x220', width: 300, height: 220 }}
          style={[styles.image, { borderColor: theme['border-alternative-color-1'] }]}
        />
        <View style={styles.buttonContainer}>
          <Button
            disabled={status === STATUS.loading}
            onPress={() => initLogIn(config.PROVIDER_NAMES.utahid)}
            accessoryLeft={UtahIdLogoImage}
            status="basic"
            appearance="outline"
            style={styles.oauthButton}
            accessible={true}
            accessibilityLabel="sign in with utahid"
          >
            Sign in with UtahID
          </Button>
          {userType === config.USER_TYPES.public ? (
            <>
              <SocialButton
                providerName={config.PROVIDER_NAMES.google}
                normalImage={googleBtn}
                disabledImage={googleBtnDisabled}
                pressedImage={googleBtnPressed}
              />
              <SocialButton
                providerName={config.PROVIDER_NAMES.facebook}
                normalImage={facebookBtn}
                disabledImage={facebookBtnDisabled}
                pressedImage={facebookBtnPressed}
              />
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
  buttonContainer: {
    alignItems: 'center',
  },
  oauthButton: {
    marginBottom: 10,
  },
  socialImage: {
    resizeMode: 'contain',
    height: 60,
  },
});
