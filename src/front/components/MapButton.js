import { Button, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getIcon } from '../services/icons';

const MapButton = ({ iconPack, iconName, onPress, style, showAlert, iconSize, color, children, status = 'basic' }) => {
  const theme = useTheme();
  const buttonSize = 30;
  const alertSize = 12;

  if (!color) {
    color = ['basic', 'success'].includes(status) ? theme['color-basic-700'] : 'white';
  }

  const ButtonIcon = () => {
    const Icon = getIcon({
      pack: iconPack,
      name: iconName,
      color,
      size: iconSize || buttonSize,
    });

    const AlertIcon = getIcon({
      pack: 'font-awesome',
      name: 'circle',
      size: alertSize,
      color: theme['color-warning-500'],
    });

    const size = { height: buttonSize, width: buttonSize };

    return (
      <View style={[styles.container, children ? null : size]}>
        <Icon />
        {showAlert ? (
          <View style={styles.alertIcon}>
            <AlertIcon />
          </View>
        ) : null}
        {children ? (
          <Text category="h5" style={{ color }}>
            {` ${children}`}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View
      // eslint-disable-next-line react-native/no-color-literals
      style={{
        elevation: 5,
        backgroundColor: 'transparent',
        shadowColor: theme['color-basic-800'],
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.8,
      }}
    >
      <Button accessoryLeft={ButtonIcon} style={style} size="tiny" onPress={onPress} status={status} />
    </View>
  );
};

MapButton.propTypes = {
  iconPack: propTypes.string.isRequired,
  iconName: propTypes.string.isRequired,
  onPress: propTypes.func.isRequired,
  style: propTypes.object,
  showAlert: propTypes.bool,
  iconSize: propTypes.number,
  color: propTypes.string,
  children: propTypes.string,
  status: propTypes.string,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});

export default MapButton;
