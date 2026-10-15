import { Button, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Autolink from 'react-native-autolink';
import { getIcon } from '../../services/icons';
import t from '../../services/localization';
import { getAssistancePrompt } from '../../services/location';
import useStyles from '../../services/styles';

function Location({ onSetLocation, onCancel }) {
  const commonStyles = useStyles();
  const theme = useTheme();
  // show the generic prompt right away (and when offline) and swap in the
  // local dispatch center if the lookup succeeds
  const [assistancePrompt, setAssistancePrompt] = React.useState(() =>
    t('services.location.liveAnimalLocalLaw'),
  );

  React.useEffect(() => {
    let isCurrent = true;
    getAssistancePrompt()
      .then((prompt) => {
        if (isCurrent) {
          setAssistancePrompt(prompt);
        }
      })
      .catch((error) => console.error(error));

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <View>
      <Text>{t('components.reports.location.crosshairPrompt')}</Text>
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
        {t('components.reports.location.setLocation')}
      </Button>
      <Button appearance="ghost" onPress={() => onCancel()}>
        {t('cancel')}
      </Button>
      <Text appearance="hint" style={styles.note}>
        <Autolink phone text={assistancePrompt} />
      </Text>
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
