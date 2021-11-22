import { storiesOf } from '@storybook/react-native';
import { Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import Species from '../../components/reports/Species';
import RootView from '../../components/RootView';

const Default = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState({
      species: null,
      species_confidence_level: null,
    });

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{JSON.stringify(value, null, 2)}</Text>
          <Species onChange={setValue} values={value} />
        </ScrollView>
      </RootView>
    );
  });
};

storiesOf('Species', module).add('default', Default);
