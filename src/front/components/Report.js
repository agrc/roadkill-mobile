import { Button, Card, Divider, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Autolink from 'react-native-autolink';
import config from '../config';
import { getIcon } from '../icons';

const SET_LOCATION_VIEW = 'set_location_view';
const MAIN_VIEW = 'main_view';
const COMMON_ANIMATION_PROPS = {
  useNativeDriver: false,
  duration: 250,
};

const Report = ({ visible, setVisible, setHeight, setMarker, carcassCoordinates }) => {
  const animatedMaxHeight = React.useRef(new Animated.Value(0));
  const windowDimensions = useWindowDimensions();
  const theme = useTheme();
  const locationViewHeight = React.useRef(null);
  const [view, setView] = React.useState(SET_LOCATION_VIEW);
  const [showMain, setShowMain] = React.useState(false);

  const Header = (props) => (
    <View {...props} style={[props.style, styles.header, { paddingTop: showMain ? 50 : null }]}>
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
    if (visible) {
      Animated.timing(animatedMaxHeight.current, {
        // is there a better way to get the height of the animated view?
        // I'm hoping that 50% of window height is good for the smaller devices...
        toValue: windowDimensions.height * 0.5,
        ...COMMON_ANIMATION_PROPS,
      }).start(() => {
        setHeight(locationViewHeight.current);
      });
    } else {
      Animated.timing(animatedMaxHeight.current, {
        toValue: 0,
        ...COMMON_ANIMATION_PROPS,
      }).start();
    }
  }, [visible]);

  React.useEffect(() => {
    const newMaxHeight = view === MAIN_VIEW ? windowDimensions.height : windowDimensions.height * 0.5;

    if (visible) {
      if (view === MAIN_VIEW) {
        setShowMain(true);
      }

      Animated.timing(animatedMaxHeight.current, {
        toValue: newMaxHeight,
        ...COMMON_ANIMATION_PROPS,
      }).start(() => {
        if (view === SET_LOCATION_VIEW) {
          setShowMain(false);
        }
      });
    }
  }, [view]);

  const callText = `If you encounter a live animal that needs assistance, please call ${config.LIVE_ANIMAL_PHONE}.`;
  const iconSize = 20;

  const isDirty = () => {
    return carcassCoordinates !== null;
  };

  const onClose = async () => {
    const close = () => {
      setVisible(false);
      setView(SET_LOCATION_VIEW);
      setShowMain(false);
    };

    if (isDirty()) {
      Alert.alert('Are you sure?', 'All in-progress report data will be lost.', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close',
          onPress: () => close(),
        },
      ]);
    } else {
      close();
    }
  };

  const onSetLocation = () => {
    setMarker();

    setTimeout(() => setView(MAIN_VIEW), 600);
  };

  return (
    <Animated.View
      // The reason why I'm doing maxHeight rather than height is because we can't find the
      // height of the animated view until it's displayed. A fixed height would not be flexible
      // enough for different screen sizes.
      style={[styles.container, { maxHeight: animatedMaxHeight.current }]}
      onLayout={(event) => (locationViewHeight.current = event.nativeEvent.layout.height)}
    >
      <Card style={styles.card} header={Header} disabled>
        {!showMain ? (
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
              onPress={onSetLocation}
            >
              Set Location
            </Button>
          </View>
        ) : (
          <Button
            accessoryLeft={getIcon({
              pack: 'font-awesome-5',
              name: 'crosshairs',
              size: 20,
            })}
            style={styles.margin}
            onPress={() => setView(SET_LOCATION_VIEW)}
            appearance="outline"
          >
            Edit Location
          </Button>
        )}
        {showMain ? (
          <View style={{ height: 900 }}>
            <Text>main report form placeholder</Text>
            <Button status="info" style={styles.margin}>
              Submit Report
            </Button>
          </View>
        ) : null}
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
