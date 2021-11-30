import { storiesOf } from '@storybook/react-native';
import { Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import Species from '../../components/reports/Species';
import RootView from '../../components/RootView';

const getStory = (initialAbleToIdentify) => {
  const Story = () =>
    React.createElement(() => {
      const [value, setValue] = React.useState({
        species_id: null,
        common_name: null,
        scientific_name: null,
        species_type: null,
        species_class: null,
        species_order: null,
        family: null,
        species_confidence_level: null,
      });
      const [ableToIdentify, setAbleToIdentify] = React.useState(initialAbleToIdentify);

      return (
        <RootView>
          <ScrollView style={{ paddingHorizontal: 25 }}>
            <Text category="c1">{JSON.stringify(value, null, 2)}</Text>
            <Species
              onChange={setValue}
              values={value}
              ableToIdentify={ableToIdentify}
              setAbleToIdentify={setAbleToIdentify}
            />
          </ScrollView>
        </RootView>
      );
    });

  return Story;
};

storiesOf('Species', module).add('able to identify', getStory(true)).add('not able to identify', getStory(false));
