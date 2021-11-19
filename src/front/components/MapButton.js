import { Button, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getIcon } from '../icons';

const MapButton = ({ iconPack, iconName, onPress, style, showAlert, iconSize, color }) => {
  const theme = useTheme();
  const buttonSize = 30;
  const alertSize = 12;
  const ButtonIcon = () => {
    const Icon = getIcon({
      pack: iconPack,
      name: iconName,
      color: color || 'white',
      size: iconSize || buttonSize,
    });
    const AlertIcon = getIcon({
      pack: 'font-awesome',
      name: 'circle',
      size: alertSize,
      color: theme['color-warning-500'],
    });

    return (
      <View style={{ height: buttonSize, width: buttonSize, justifyContent: 'center', alignItems: 'center' }}>
        <Icon />
        {showAlert ? (
          <View style={styles.alertIcon}>
            <AlertIcon />
          </View>
        ) : null}
      </View>
    );
  };

  return <Button accessoryLeft={ButtonIcon} style={style} size="tiny" onPress={onPress} />;
};

MapButton.propTypes = {
  iconPack: propTypes.string.isRequired,
  iconName: propTypes.string.isRequired,
  onPress: propTypes.func.isRequired,
  style: propTypes.object,
  showAlert: propTypes.bool,
  iconSize: propTypes.number,
  color: propTypes.string,
};

const styles = StyleSheet.create({
  alertIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});

export default MapButton;
