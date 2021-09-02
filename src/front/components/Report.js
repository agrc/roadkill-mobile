import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Autolink from 'react-native-autolink';
import config from '../config';

const Report = ({ visible, setVisible }) => {
  const animatedHeight = React.useRef(new Animated.Value(0));
  const windowDimensions = useWindowDimensions();

  const CloseIcon = () => <MaterialCommunityIcons name="close-circle-outline" size={30} />;
  const Header = (props) => (
    <View {...props} style={[props.style, styles.header]}>
      <Text category="h5">Report a Carcass</Text>
      <Button accessoryLeft={CloseIcon} size="tiny" appearance="ghost" onPress={() => setVisible(false)} />
    </View>
  );
  Header.propTypes = {
    style: propTypes.array,
  };

  React.useEffect(() => {
    const commonProps = {
      useNativeDriver: false,
      duration: 250,
    };

    if (visible) {
      Animated.timing(animatedHeight.current, {
        // is there a better way to get the height of the animated view?
        // I'm hoping that 50% is good for the smaller devices...
        toValue: windowDimensions.height / 2,
        ...commonProps,
      }).start();
    } else {
      Animated.timing(animatedHeight.current, {
        toValue: 0,
        ...commonProps,
      }).start();
    }
  }, [visible]);

  const callText = `If you encounter a live animal that needs assistance, please call ${config.LIVE_ANIMAL_PHONE}.`;

  return (
    <Animated.View style={[styles.container, { maxHeight: animatedHeight.current }]}>
      <Card style={styles.card} header={Header} disabled>
        <View>
          <Card status="warning" disabled>
            <Text category="p2">
              <Autolink phone text={callText} />
            </Text>
          </Card>
          <Text category="h6">Location</Text>
          <Text category="p1">Move the map to place the crosshair at the location of the animal carcass.</Text>
          <Button>Set Location</Button>
          <Button>Use My Location</Button>
        </View>
      </Card>
    </Animated.View>
  );
};
Report.propTypes = {
  visible: propTypes.bool,
  setVisible: propTypes.func,
};

const RADIUS = 15;
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  card: {
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  innerCard: {
    padding: 0,
  },
});

export default Report;
