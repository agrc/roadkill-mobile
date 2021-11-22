import { Card, Divider, Input, List, ListItem, Modal, Text, useTheme } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { getIcon } from '../../services/icons';
import { PADDING } from '../../services/styles';

export default function SearchList({ value, onChange, placeholder, items, field = null, style }) {
  const [filteredItems, setFilteredItems] = React.useState([]);
  const [inputValue, setInputValue] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    if (showModal) {
      searchInputRef.current?.focus();
    }
  }, [showModal]);

  function itemOrValue(item) {
    return field ? item[field] : item;
  }

  const getFilter = (text) => {
    return (item) => {
      if (text === null) return false;

      return itemOrValue(item).toLowerCase().includes(text.toLowerCase());
    };
  };

  React.useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  const onChangeText = (text) => {
    setInputValue(text);
    let filteredItems = items.filter(getFilter(text));
    if (filteredItems.length === 1 && itemOrValue(filteredItems[0]) === text) {
      setFilteredItems([]);
    } else {
      setFilteredItems(filteredItems);
    }
  };

  const onSelectItem = (item) => {
    onChange(item);

    setInputValue(itemOrValue(item));
    setFilteredItems([]);
    setShowModal(false);
  };

  const clearInput = () => {
    if (inputValue === '') {
      setShowModal(false);
    }

    onChangeText('');
    onChange(null);
  };

  const renderClearIcon = (props) => {
    const ClearIcon = getIcon({
      pack: 'material',
      name: 'close',
    });

    return (
      <TouchableOpacity onPress={clearInput}>
        <ClearIcon {...props} />
      </TouchableOpacity>
    );
  };

  const theme = useTheme();

  const valueStyle = {};

  if (!value) {
    valueStyle.color = theme['color-basic-500'];
  }

  const ArrowIcon = getIcon({
    pack: 'eva',
    name: 'arrow-forward',
    color: theme['color-basic-800'],
    size: 24,
  });

  const windowDimensions = useWindowDimensions();
  const modalStyle = {
    height: Platform.select({
      ios: '100%',
      android: windowDimensions.height - StatusBar.currentHeight * 2,
    }),
    width: windowDimensions.width - PADDING * 4,
  };

  const onValuePress = () => {
    onChangeText('');
    setShowModal(true);
  };

  return (
    <View style={style}>
      <Card onPress={onValuePress}>
        <View style={styles.innerValueContainer}>
          <Text style={valueStyle}>{value ? itemOrValue(value) : `search by ${placeholder}`}</Text>
          <ArrowIcon />
        </View>
      </Card>

      <Modal
        visible={showModal}
        backdropStyle={{ backgroundColor: theme['color-basic-transparent-600'] }}
        style={modalStyle}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Card disabled={true} style={{ flex: 1 }}>
            <Input
              accessoryRight={renderClearIcon}
              value={inputValue}
              placeholder={placeholder}
              onChangeText={onChangeText}
              ref={searchInputRef}
            />
            <List
              data={filteredItems}
              ItemSeparatorComponent={Divider}
              renderItem={({ item }) => (
                <ListItem key={itemOrValue(item)} title={itemOrValue(item)} onPress={() => onSelectItem(item)} />
              )}
              keyboardShouldPersistTaps="always"
              style={{ backgroundColor: theme['color-basic-100'] }}
            />
          </Card>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  innerValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: -8,
  },
});

SearchList.propTypes = {
  value: propTypes.oneOfType([propTypes.string, propTypes.object]),
  onChange: propTypes.func.isRequired,
  placeholder: propTypes.string.isRequired,
  items: propTypes.array.isRequired,
  field: propTypes.string,
  style: propTypes.object,
};
