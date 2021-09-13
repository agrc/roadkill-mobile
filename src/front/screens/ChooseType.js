import { Button, Layout, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import useAuth from '../auth/context';
import config from '../config';
import RootView from '../RootView';

export default function ChooseTypeScreen({ navigation }) {
  const { setUserType } = useAuth();
  const Option = ({ children, type }) => {
    const onPress = () => {
      setUserType(type);
      navigation.navigate('login');
    };

    return (
      <Button
        appearance="outline"
        style={styles.option}
        onPress={onPress}
        status="info"
        size="giant"
        accessibilityRole="button"
      >
        {children}
      </Button>
    );
  };
  Option.propTypes = {
    children: propTypes.string,
    type: propTypes.string,
  };

  return (
    <RootView>
      <Layout style={styles.layout}>
        <Text category="h3" style={styles.center}>
          Welcome to the Utah Wildlife-Vehicle Collision Reporter
        </Text>
        <Text category="h3" style={styles.center}>
          I am a...
        </Text>

        <View style={styles.optionsContainer}>
          <Option type={config.USER_TYPES.public}>
            Member of the public that would like to report an animal carcass
          </Option>
          <Option type={config.USER_TYPES.contractor}>State contractor</Option>
          <Option type={config.USER_TYPES.agencyEmployee}>State agency employee</Option>
          <Button onPress={() => navigation.navigate('storybook')}>Storybook</Button>
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
});
