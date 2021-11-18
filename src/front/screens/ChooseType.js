import { Button, Layout, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import facebookBtnDisabled from '../assets/facebook/btn_light_disabled.png';
import facebookBtn from '../assets/facebook/btn_light_normal.png';
import facebookBtnPressed from '../assets/facebook/btn_light_pressed.png';
import googleBtnDisabled from '../assets/google/btn_google_signin_light_disabled_web.png';
import googleBtn from '../assets/google/btn_google_signin_light_normal_web.png';
import googleBtnPressed from '../assets/google/btn_google_signin_light_pressed_web.png';
import utahIdLogo from '../assets/logo-utahid.png';
import useAuth, { STATUS } from '../auth/context';
import config from '../config';
import { getIcon } from '../icons';
import RootView from '../RootView';

const carrotRight = getIcon({
  pack: 'font-awesome',
  name: 'caret-right',
});

const carrotDown = getIcon({
  pack: 'font-awesome',
  name: 'caret-down',
});

export default function ChooseTypeScreen({ navigation }) {
  const { setUserType } = useAuth();
  const Option = ({ children, type, onPress, accessoryLeft }) => {
    const innerOnPress = () => {
      setUserType(type);
      onPress();
    };

    return (
      <Button
        appearance="outline"
        style={styles.option}
        onPress={innerOnPress}
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
    type: propTypes.string.isRequired,
    onPress: propTypes.func.isRequired,
    accessoryLeft: propTypes.func,
  };

  const { logIn, status } = useAuth();
  const showSpinner = status === STATUS.loading;
  const initLogIn = async (providerName) => {
    const { success, registered } = await logIn(providerName);
    if (!success) {
      return;
    }
    if (!registered) {
      navigation.navigate('new-user');
    }
  };

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

  const [showAuthButtons, setShowAuthButtons] = React.useState(false);

  return (
    <RootView showSpinner={showSpinner}>
      <Layout style={styles.layout}>
        <Text category="h3" style={styles.center}>
          Welcome to the Utah Wildlife-Vehicle Collision Reporter
        </Text>
        <Text category="h3" style={styles.center}>
          I am a...
        </Text>

        <View style={styles.optionsContainer}>
          <Option
            type={config.USER_TYPES.public}
            onPress={() => setShowAuthButtons(!showAuthButtons)}
            accessoryLeft={showAuthButtons ? carrotDown : carrotRight}
          >
            Member of the public
          </Option>
          <Collapsible collapsed={!showAuthButtons} style={styles.buttonContainer}>
            <Button
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
          </Collapsible>
          <Option type={config.USER_TYPES.contractor} onPress={() => initLogIn(config.PROVIDER_NAMES.utahid)}>
            State contractor
          </Option>
          <Option type={config.USER_TYPES.agencyEmployee} onPress={() => initLogIn(config.PROVIDER_NAMES.utahid)}>
            State agency employee
          </Option>
          {config.SHOW_STORYBOOK ? <Button onPress={() => navigation.navigate('storybook')}>Storybook</Button> : null}
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
  socialImage: {
    resizeMode: 'contain',
    height: 60,
  },
});
