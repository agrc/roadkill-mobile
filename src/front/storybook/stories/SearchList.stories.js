import { storiesOf } from '@storybook/react-native';
import { Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import SearchList from '../../components/reports/SearchList';
import RootView from '../../components/RootView';
import constants from '../../services/constants.json';

const emptyObject = {
  species_id: null,
  common_name: null,
  scientific_name: null,
  species_type: null,
  species_class: null,
  species_order: null,
  family: null,
};

const ItemsAsObjects = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(emptyObject);

    const items = constants.species.slice(0, 18);

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(value, null, '  ')}`}</Text>
          <SearchList value={value} onChange={setValue} items={items} placeholder="items as objects" />
        </ScrollView>
      </RootView>
    );
  });
};

const ManyObjectItems = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(emptyObject);

    const items = constants.species;

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(value, null, '  ')}`}</Text>
          <SearchList value={value} onChange={setValue} items={items} placeholder="many objects" />
        </ScrollView>
      </RootView>
    );
  });
};

const ManyStringItems = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(null);

    const items = [...new Set(constants.species.map((item) => item.family))].sort();

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(value, null, '  ')}`}</Text>
          <SearchList value={value} onChange={setValue} items={items} placeholder="many strings" />
        </ScrollView>
      </RootView>
    );
  });
};

const ItemsAsStrings = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(null);
    const items = ['one', 'two', 'three', 'four', 'five'];

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(value, null, '  ')}`}</Text>
          <SearchList value={value} onChange={setValue} items={items} placeholder="items as strings" />
        </ScrollView>
      </RootView>
    );
  });
};

storiesOf('SearchList', module)
  .add('items as objects', ItemsAsObjects)
  .add('items as strings', ItemsAsStrings)
  .add('many object items', ManyObjectItems)
  .add('many string items', ManyStringItems);
