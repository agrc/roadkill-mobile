import { Button, Divider, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Autolink from 'react-native-autolink';
import config from '../../config';
import { getIcon } from '../../icons';
import useStyles from '../../styles';

function Location({ onSetLocation, onEditLocation, showEdit }) {
  const callText = `If you encounter a live animal that needs assistance, please call ${config.LIVE_ANIMAL_PHONE}.`;
  const commonStyles = useStyles();

  return (
    <>
      {showEdit ? (
        <View>
          <Text appearance="hint" style={styles.note}>
            <Autolink phone text={callText} />
          </Text>
          <Divider />
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
        </View>
      ) : (
        <Button
          accessoryLeft={getIcon({
            pack: 'font-awesome-5',
            name: 'crosshairs',
          })}
          style={commonStyles.margin}
          onPress={onEditLocation}
          appearance="outline"
        >
          Change Location
        </Button>
      )}
    </>
  );
}

Location.propTypes = {
  onSetLocation: propTypes.func.isRequired,
  onEditLocation: propTypes.func.isRequired,
  showEdit: propTypes.bool.isRequired,
};

const styles = StyleSheet.create({
  note: {
    marginBottom: 10,
  },
});

export default Location;
