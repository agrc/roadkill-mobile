import { Button, Card, Divider, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Autolink from 'react-native-autolink';
import config from '../config';
import { getIcon } from '../icons';

const Report = ({ visible, setVisible, setHeight, setMarker, carcassCoordinates }) => {
  const animatedHeight = React.useRef(new Animated.Value(0));
  const windowDimensions = useWindowDimensions();
  const theme = useTheme();
  const height = React.useRef(null);

  const Header = (props) => (
    <View {...props} style={[props.style, styles.header]}>
      <Text category="h5">Report a Carcass</Text>
      <Button
        accessoryLeft={getIcon({
          pack: 'material-community',
          name: 'close-circle-outline',
          size: 30,
          color: theme['color-basic-800'],
        })}
        size="tiny"
        appearance="ghost"
        onPress={onClose}
        style={styles.closeButton}
      />
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
        // I'm hoping that 50% of window height is good for the smaller devices...
        toValue: windowDimensions.height / 2,
        ...commonProps,
      }).start(() => setHeight(height.current));
    } else {
      Animated.timing(animatedHeight.current, {
        toValue: 0,
        ...commonProps,
      }).start();
    }
  }, [visible]);

  const callText = `If you encounter a live animal that needs assistance, please call ${config.LIVE_ANIMAL_PHONE}.`;
  const iconSize = 20;

  const isDirty = () => {
    return carcassCoordinates !== null;
  };

  const onClose = async () => {
    if (isDirty()) {
      Alert.alert('Are you sure?', 'All in-progress report data will be lost', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close',
          onPress: () => setVisible(false),
        },
      ]);
    } else {
      setVisible(false);
    }
  };

  return (
    <Animated.View
      style={[styles.container, { maxHeight: animatedHeight.current }]}
      onLayout={(event) => (height.current = event.nativeEvent.layout.height)}
    >
      <Card style={styles.card} header={Header} disabled>
        <View>
          <Text appearance="hint" style={styles.note}>
            <Autolink phone text={callText} />
          </Text>
          <Divider />
          <Text category="h6" style={styles.margin}>
            Location
          </Text>
          <Text>Move the map to place the crosshair at the location of the animal carcass.</Text>
          <Button
            accessoryLeft={getIcon({ pack: 'font-awesome-5', name: 'crosshairs', size: iconSize })}
            style={styles.margin}
            onPress={setMarker}
          >
            Set Location
          </Button>
        </View>
      </Card>
    </Animated.View>
  );
};

Report.propTypes = {
  visible: propTypes.bool,
  setVisible: propTypes.func,
  setHeight: propTypes.func,
  setMarker: propTypes.func,
  carcassCoordinates: propTypes.object,
};

const PADDING = 10;
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
  note: {
    marginBottom: PADDING,
  },
  margin: {
    marginVertical: PADDING,
  },
  closeButton: { marginRight: -10 },
});

export default Report;
