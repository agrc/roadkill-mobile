import { Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import RootView from '../RootView';
import Species from './Species';

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
              reset={false}
            />
          </ScrollView>
        </RootView>
      );
    });

  return Story;
};

export default {
  title: 'Species',
  component: Species,
};

export const AbleToIdentify = getStory(true);

export const NotAbleToIdentify = getStory(false);
