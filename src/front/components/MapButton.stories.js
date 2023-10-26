import propTypes from 'prop-types';
import { View } from 'react-native';
import MapButton from './MapButton';

const Container = ({ children }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20 }}>{children}</View>
);
Container.propTypes = {
  children: propTypes.node,
};

export default {
  title: 'MapButton',
  component: MapButton,
};

export const Default = () => (
  <>
    <Container>
      <MapButton
        iconPack="material-community"
        iconName="menu"
        onPress={() => console.log('clicked')}
        showAlert={false}
      />
      <MapButton iconPack="material-community" iconName="menu" onPress={() => console.log('clicked')} showAlert={false}>
        With Text
      </MapButton>
    </Container>
    <Container>
      <MapButton
        iconPack="material-community"
        iconName="menu"
        onPress={() => console.log('clicked')}
        showAlert={false}
        status="success"
      >
        success
      </MapButton>
      <MapButton
        iconPack="material-community"
        iconName="menu"
        onPress={() => console.log('clicked')}
        showAlert={false}
        status="basic"
      >
        basic
      </MapButton>
    </Container>
    <Container>
      <MapButton
        iconPack="material-community"
        iconName="menu"
        onPress={() => console.log('clicked')}
        showAlert={false}
        status="danger"
      >
        danger
      </MapButton>
    </Container>
  </>
);

export const ShowAlert = () => (
  <Container>
    <MapButton iconPack="material-community" iconName="menu" onPress={() => console.log('pressed')} alertNumber={5} />
    <MapButton iconPack="material-community" iconName="menu" onPress={() => console.log('pressed')} alertNumber={26} />
  </Container>
);
