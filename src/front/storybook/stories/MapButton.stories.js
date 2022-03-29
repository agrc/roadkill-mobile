import { action } from '@storybook/addon-actions';
import { boolean, number } from '@storybook/addon-knobs';
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
  .add('default', () => (
    <>
      <Container>
        <MapButton
          iconPack="material-community"
          iconName="menu"
          onPress={action('clicked')}
          showAlert={boolean('showAlert', false)}
        />
        <MapButton
          iconPack="material-community"
          iconName="menu"
          onPress={action('clicked')}
          showAlert={boolean('showAlert', false)}
        >
          With Text
        </MapButton>
      </Container>
      <Container>
        <MapButton
          iconPack="material-community"
          iconName="menu"
          onPress={action('clicked')}
          showAlert={boolean('showAlert', false)}
          status="success"
        >
          success
        </MapButton>
        <MapButton
          iconPack="material-community"
          iconName="menu"
          onPress={action('clicked')}
          showAlert={boolean('showAlert', false)}
          status="basic"
        >
          basic
        </MapButton>
      </Container>
      <Container>
        <MapButton
          iconPack="material-community"
          iconName="menu"
          onPress={action('clicked')}
          showAlert={boolean('showAlert', false)}
          status="danger"
        >
          danger
        </MapButton>
      </Container>
    </>
  ))
  .add('showAlert', () => (
    <Container>
      <MapButton
        iconPack="material-community"
        iconName="menu"
        onPress={() => console.log('pressed')}
        alertNumber={number('alertNumber_1', 5)}
      />
      <MapButton
        iconPack="material-community"
        iconName="menu"
        onPress={() => console.log('pressed')}
        alertNumber={number('alertNumber_2', 26)}
      />
    </Container>
  ));
