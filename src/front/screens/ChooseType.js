import { Button, Layout, Text } from '@ui-kitten/components';
import commonConfig from 'common/config';
import * as AppleAuthentication from 'expo-apple-authentication';
import propTypes from 'prop-types';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
// import facebookBtnDisabled from '../assets/facebook/btn_light_disabled.png';
// import facebookBtn from '../assets/facebook/btn_light_normal.png';
// import facebookBtnPressed from '../assets/facebook/btn_light_pressed.png';
import googleBtnDisabled from '../assets/google/btn_google_signin_light_disabled_web.png';
import googleBtn from '../assets/google/btn_google_signin_light_normal_web.png';
import googleBtnPressed from '../assets/google/btn_google_signin_light_pressed_web.png';
import utahIdLogo from '../assets/logo-utahid.png';
import useAuth, { STATUS } from '../auth/context';
import RootView from '../components/RootView';
import config from '../services/config';
import { getIcon } from '../services/icons';
import t from '../services/localization';

const carrotRight = getIcon({
  pack: 'font-awesome',
  name: 'caret-right',
});

const carrotDown = getIcon({
  pack: 'font-awesome',
  name: 'caret-down',
});

export default function ChooseTypeScreen({ navigation }) {
  const [appleSignInIsAvailable, setAppleSignInIsAvailable] =
    React.useState(false);

  React.useEffect(() => {
    const checkAppleSignIn = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleSignInIsAvailable(isAvailable);
    };
    checkAppleSignIn();
  }, []);

  const { setUserType } = useAuth();
  const Option = ({ children, onPress, accessoryLeft }) => {
    return (
      <Button
        appearance="outline"
        style={styles.option}
        onPress={onPress}
        status="info"
        size="giant"
        accessibilityRole="button"
        accessoryLeft={accessoryLeft}
      >
        {children}
      </Button>
    );
  };
  Option.propTypes = {
    children: propTypes.string.isRequired,
    onPress: propTypes.func.isRequired,
    accessoryLeft: propTypes.func,
  };

  const { logIn, status } = useAuth();
  const showSpinner = status === STATUS.loading;
  const initLogIn = async (providerName, userType) => {
    setUserType(userType);
    const { success, registered } = await logIn(providerName);
    if (!success) {
      return;
    }
    if (!registered) {
      navigation.navigate('new-user');
    }
  };

  const UtahIdLogoImage = () => (
    <Image source={utahIdLogo} resizeMode="contain" />
  );
  const SocialButton = ({
    providerName,
    normalImage,
    disabledImage,
    pressedImage,
  }) => {
    const [pressed, setPressed] = React.useState(false);
    return (
      <Pressable
        onPress={() => initLogIn(providerName, config.USER_TYPES.public)}
        disabled={showSpinner}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessible={true}
        accessibilityLabel={`${t(
          'screens.chooseType.signInWith',
        )} ${providerName}`}
        style={styles.oauthButton}
      >
        <Image
          source={
            showSpinner ? disabledImage : pressed ? pressedImage : normalImage
          }
          style={styles.socialImage}
        />
      </Pressable>
    );
  };
  SocialButton.propTypes = {
    providerName: propTypes.string.isRequired,
    normalImage: propTypes.node.isRequired,
    disabledImage: propTypes.node.isRequired,
    pressedImage: propTypes.node.isRequired,
  };

  const [showAuthButtons, setShowAuthButtons] = React.useState(true);

  return (
    <RootView showSpinner={showSpinner}>
      <Layout style={styles.layout}>
        <Text category="h3" style={styles.center}>
          {t('screens.chooseType.welcome')}
        </Text>
        <Text category="h3" style={styles.center}>
          {t('screens.chooseType.iam')}
        </Text>

        <View style={styles.optionsContainer}>
          <Option
            onPress={() => setShowAuthButtons(!showAuthButtons)}
            accessoryLeft={showAuthButtons ? carrotDown : carrotRight}
          >
            {t('screens.chooseType.public')}
          </Option>
          <Collapsible
            collapsed={!showAuthButtons}
            style={styles.buttonContainer}
          >
            {appleSignInIsAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={5}
                style={[styles.oauthButton, styles.appleButton]}
                onPress={() =>
                  initLogIn(
                    commonConfig.authProviderNames.apple,
                    config.USER_TYPES.public,
                  )
                }
              />
            ) : null}
            <Button
              onPress={() =>
                initLogIn(
                  commonConfig.authProviderNames.utahid,
                  config.USER_TYPES.public,
                )
              }
              accessoryLeft={UtahIdLogoImage}
              status="basic"
              appearance="outline"
              style={styles.oauthButton}
              accessible={true}
              accessibilityLabel={t('screens.chooseType.utahid')}
            >
              {t('screens.chooseType.utahid')}
            </Button>
            <SocialButton
              providerName={commonConfig.authProviderNames.google}
              normalImage={googleBtn}
              disabledImage={googleBtnDisabled}
              pressedImage={googleBtnPressed}
            />
            {/* <SocialButton
              providerName={commonConfig.authProviderNames.facebook}
              normalImage={facebookBtn}
              disabledImage={facebookBtnDisabled}
              pressedImage={facebookBtnPressed}
            /> */}
          </Collapsible>
          <Option
            onPress={() =>
              initLogIn(
                commonConfig.authProviderNames.utahid,
                config.USER_TYPES.contractor,
              )
            }
          >
            {t('screens.chooseType.contractor')}
          </Option>
          <Option
            onPress={() =>
              initLogIn(
                commonConfig.authProviderNames.utahid,
                config.USER_TYPES.agency,
              )
            }
          >
            {t('screens.chooseType.agency')}
          </Option>
          {config.SHOW_STORYBOOK ? (
            <Button onPress={() => navigation.navigate('storybook')}>
              Storybook
            </Button>
          ) : null}
        </View>
      </Layout>
    </RootView>
  );
}
ChooseTypeScreen.propTypes = {
  navigation: propTypes.object,
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  optionsContainer: {
    justifyContent: 'space-between',
    width: '100%',
  },
  option: {
    marginBottom: 10,
    width: '100%',
  },
  center: {
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  oauthButton: {
    marginBottom: 10,
  },
  appleButton: {
    width: 250,
    height: 55,
  },
  socialImage: {
    resizeMode: 'contain',
    height: 60,
  },
});
