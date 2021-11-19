import { Button, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Autolink from 'react-native-autolink';
import config from '../../config';
import { getIcon } from '../../icons';
import useStyles from '../../styles';

function Location({ onSetLocation }) {
  const callText = `If you encounter a live animal that needs assistance, please call ${config.LIVE_ANIMAL_PHONE}.`;
  const commonStyles = useStyles();

  return (
    <View>
      <Text category="h6" style={commonStyles.margin}>
        Location
      </Text>
      <Text>Move the map to place the crosshair at the location of the animal carcass.</Text>
      <Button
        accessoryLeft={getIcon({ pack: 'font-awesome-5', name: 'crosshairs' })}
        style={commonStyles.margin}
        onPress={onSetLocation}
      >
        Set Location
      </Button>
      <Text appearance="hint" style={styles.note}>
        <Autolink phone text={callText} />
      </Text>
    </View>
  );
}

Location.propTypes = {
  onSetLocation: propTypes.func.isRequired,
};

const styles = StyleSheet.create({
  note: {
    marginBottom: 10,
  },
});

export default Location;
