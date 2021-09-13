import { action } from '@storybook/addon-actions';
import { boolean } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';
import propTypes from 'prop-types';
import React from 'react';
import { View } from 'react-native';
import MapButton from '../../components/MapButton';

const Container = ({ children }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20 }}>{children}</View>
);
Container.propTypes = {
  children: propTypes.node,
};
storiesOf('MapButton', module)
  .addDecorator((getStory) => <Container>{getStory()}</Container>)
  .add('default', () => (
    <MapButton
      iconPack="material-community"
      iconName="menu"
      onPress={action('clicked')}
      showAlert={boolean('showAlert', false)}
    />
  ))
  .add('showAlert', () => (
    <MapButton
      iconPack="material-community"
      iconName="menu"
      onPress={() => console.log('pressed')}
      showAlert={boolean('showAlert', true)}
    />
  ));
