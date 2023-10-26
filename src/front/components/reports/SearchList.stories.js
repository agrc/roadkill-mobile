import { Text } from '@ui-kitten/components';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { getConstants } from '../../services/constants.js';
import RootView from '../RootView';
import SearchList from './SearchList';

const emptyObject = {
  species_id: null,
  common_name: null,
  scientific_name: null,
  species_type: null,
  species_class: null,
  species_order: null,
  family: null,
};

const useConstants = () => {
  const [constants, setConstants] = useState(null);
  useEffect(() => {
    const init = async () => {
      const constants = await getConstants();
      setConstants(constants);
    };

    init();
  }, []);

  return constants;
};

export default {
  title: 'SearchList',
  component: SearchList,
};

export const ItemsAsObjects = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(emptyObject);
    const constants = useConstants();
    const [items, setItems] = React.useState(null);

    React.useEffect(() => {
      if (constants) {
        setItems(constants.species.slice(0, 18));
      }
    }, [constants]);

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(
            value,
            null,
            '  ',
          )}`}</Text>
          {items ? (
            <SearchList
              value={value}
              onChange={setValue}
              items={items}
              placeholder="items as objects"
            />
          ) : null}
        </ScrollView>
      </RootView>
    );
  });
};

export const ManyObjectItems = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(emptyObject);

    const constants = useConstants();
    const [items, setItems] = React.useState(null);

    React.useEffect(() => {
      if (constants) {
        setItems(constants.species);
      }
    }, [constants]);

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(
            value,
            null,
            '  ',
          )}`}</Text>
          {items ? (
            <SearchList
              value={value}
              onChange={setValue}
              items={items}
              placeholder="many objects"
            />
          ) : null}
        </ScrollView>
      </RootView>
    );
  });
};

export const ManyStringItems = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(null);

    const constants = useConstants();
    const [items, setItems] = React.useState(null);

    React.useEffect(() => {
      if (constants) {
        setItems(
          [...new Set(constants.species.map((item) => item.family))].sort(),
        );
        setItems(constants.species);
      }
    }, [constants]);

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(
            value,
            null,
            '  ',
          )}`}</Text>
          {items ? (
            <SearchList
              value={value}
              onChange={setValue}
              items={items}
              placeholder="many strings"
            />
          ) : null}
        </ScrollView>
      </RootView>
    );
  });
};

export const ItemsAsStrings = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(null);
    const items = ['one', 'amphibians', 'three', 'four', 'five'];

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(
            value,
            null,
            '  ',
          )}`}</Text>
          <SearchList
            value={value}
            onChange={setValue}
            items={items}
            placeholder="items as strings"
          />
        </ScrollView>
      </RootView>
    );
  });
};

export const OrganizationItems = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState({ id: null, name: null });

    const constants = useConstants();
    const [items, setItems] = React.useState(null);

    React.useEffect(() => {
      if (constants) {
        setItems(constants.organizations);
      }
    }, [constants]);

    return (
      <RootView>
        <ScrollView style={{ paddingHorizontal: 25 }}>
          <Text category="c1">{`value: ${JSON.stringify(
            value,
            null,
            '  ',
          )}`}</Text>
          <Text category="label" appearance="hint">
            Organization
          </Text>
          {items ? (
            <SearchList
              value={value}
              onChange={setValue}
              items={items}
              placeholder="organization"
              itemToString={(item) => item?.name}
              itemToKey={(item) => item?.id}
              displayPhotos={false}
              forceModal={true}
            />
          ) : null}
        </ScrollView>
      </RootView>
    );
  });
};
