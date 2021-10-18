import { storiesOf } from '@storybook/react-native';
import { Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import SearchList from '../../components/reports/SearchList';
import RootView from '../../RootView';

const ItemsAsObjects = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(null);
    const items = [
      {
        common: 'Mule Deer',
        latin: 'Odocoileus hemionus',
        type: 'Wild',
        class: 'Mammal',
        order: 'Hoofed Animals',
        family: 'Deer',
        rareWarning: false,
        frequent: true,
      },
      {
        common: 'White-tailed Deer',
        latin: 'Odocoileus virginianus',
        type: 'Wild',
        class: 'Mammal',
        order: 'Hoofed Animals',
        family: 'Deer',
        rareWarning: true,
      },
      {
        common: 'Elk',
        latin: 'Cervus canadensis',
        type: 'Wild',
        class: 'Mammal',
        order: 'Hoofed Animals',
        family: 'Deer',
        rareWarning: false,
        frequent: true,
      },
      {
        common: 'Moose',
        latin: 'Alces alces',
        type: 'Wild',
        class: 'Mammal',
        order: 'Hoofed Animals',
        family: 'Deer',
        rareWarning: false,
      },
    ];

    React.useEffect(() => {
      console.log('Story mounted');

      return () => {
        console.log('Story unmounted');
      };
    }, []);

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(value, null, '  ')}`}</Text>
          <SearchList value={value} onChange={setValue} items={items} field="common" placeholder="common name" />
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
          <SearchList value={value} onChange={setValue} items={items} placeholder="numbers" />
        </ScrollView>
      </RootView>
    );
  });
};

storiesOf('SearchList', module).add('items as objects', ItemsAsObjects).add('items as strings', ItemsAsStrings);
