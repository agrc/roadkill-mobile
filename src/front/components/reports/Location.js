import { Button, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Autolink from 'react-native-autolink';
import { getIcon } from '../../services/icons';
import { getAssistancePrompt } from '../../services/location';
import useStyles from '../../services/styles';

function Location({ onSetLocation, onCancel }) {
  const commonStyles = useStyles();
  const theme = useTheme();
  const [assistancePrompt, setAssistancePrompt] = React.useState(null);

  React.useEffect(() => {
    const init = async () => {
      const prompt = await getAssistancePrompt();
      setAssistancePrompt(prompt);
    };

    if (!assistancePrompt) {
      init();
    }
  }, []);

  return (
    <View>
      <Text>Move the map to place the crosshair at the location of the animal carcass.</Text>
      <Button
        accessoryLeft={getIcon({
          pack: 'font-awesome-5',
          name: 'crosshairs',
          color: theme['color-basic-800'],
          size: 25,
        })}
        style={commonStyles.margin}
        onPress={onSetLocation}
      >
        Set Location
      </Button>
      <Button appearance="ghost" onPress={onCancel}>
        Cancel
      </Button>
      {assistancePrompt ? (
        <Text appearance="hint" style={styles.note}>
          <Autolink phone text={assistancePrompt} />
        </Text>
      ) : null}
    </View>
  );
}

Location.propTypes = {
  onSetLocation: propTypes.func.isRequired,
  onCancel: propTypes.func.isRequired,
};

const styles = StyleSheet.create({
  note: {
    marginBottom: 10,
  },
});

export default Location;
