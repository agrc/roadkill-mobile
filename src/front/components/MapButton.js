import { Button, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { getIcon } from '../services/icons';
import AlertIcon from './AlertIcon';

const MapButton = ({
  iconPack,
  iconName,
  onPress,
  style,
  alertNumber,
  iconSize,
  color,
  children,
  status = 'basic',
}) => {
  const theme = useTheme();
  const buttonSize = 30;

  if (!color) {
    color = ['basic', 'success'].includes(status)
      ? theme['color-basic-800']
      : 'white';
  }

  const ButtonIcon = () => {
    const Icon = getIcon({
      pack: iconPack,
      name: iconName,
      color,
      size: iconSize || buttonSize,
    });

    const size = { height: buttonSize, width: buttonSize };

    return (
      <View style={[styles.container, children ? null : size]}>
        <Icon />
        {alertNumber ? <AlertIcon number={alertNumber} /> : null}
        {children ? (
          <Text category="h5" style={{ color }}>
            {` ${children}`}
          </Text>
        ) : null}
      </View>
    );
  };

  const shadowStyle = {
    shadowColor: theme['color-basic-800'],
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
  };

  return (
    <View
      // eslint-disable-next-line react-native/no-color-literals
      style={{
        backgroundColor: 'transparent',
        elevation: 5,
      }}
    >
      <Button
        accessoryLeft={ButtonIcon}
        style={[style, shadowStyle]}
        size="tiny"
        onPress={onPress}
        status={status}
      />
    </View>
  );
};

MapButton.propTypes = {
  iconPack: propTypes.string.isRequired,
  iconName: propTypes.string.isRequired,
  onPress: propTypes.func.isRequired,
  style: propTypes.object,
  alertNumber: propTypes.number,
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
});

export default MapButton;
