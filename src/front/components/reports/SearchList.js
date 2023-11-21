import {
  Card,
  Divider,
  Input,
  List,
  ListItem,
  Modal,
  Text,
  useTheme,
} from '@ui-kitten/components';
import commonConfig from 'common/config';
import { Image } from 'expo-image';
import a from 'indefinite';
import propTypes from 'prop-types';
import React, { useCallback } from 'react';
import { PixelRatio, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import config from '../../services/config';
import { getIcon } from '../../services/icons';
import { PADDING } from '../../services/styles';

const MIN_NUM_FOR_POPUP = 20;
const COMMON = 'common_name';
const ID = 'species_id';
const SCIENTIFIC = 'scientific_name';

function itemPropOrString(field) {
  return (item) => {
    if (item === null || item === undefined) {
      return null;
    }

    if (typeof item === 'string') {
      return item;
    }

    return item[field];
  };
}

const pixelRatio = PixelRatio.get();
const fallbackImage = require('../../assets/id-image-fallback.png');

function MyListItem({
  item,
  onSelectItem,
  selected,
  itemToString,
  itemToKey,
  displayPhoto = true,
}) {
  const theme = useTheme();
  const selectedStyle = {
    borderColor: theme['color-primary-500'],
  };
  const style = selected ? selectedStyle : {};
  const title = itemToString(item);
  const description = itemPropOrString(SCIENTIFIC)(item);
  if (!description) {
    style.paddingVertical = PADDING;
  }

  const imageSource = {
    uri: `${config.API}/reports/id_image/${itemToKey(item)
      .toString()
      .replace('/', '_')}/${pixelRatio}`,
    width: commonConfig.searchListImageSize,
    height: commonConfig.searchListImageSize,
    scale: pixelRatio,
  };

  const onPress = () => {
    onSelectItem(item);
  };

  return (
    <ListItem
      accessoryLeft={() =>
        displayPhoto ? (
          <Image
            style={{
              width: commonConfig.searchListImageSize,
              height: commonConfig.searchListImageSize,
            }}
            source={imageSource}
            placeholder={fallbackImage}
          />
        ) : null
      }
      title={title}
      description={
        description && title !== description
          ? ({ style }) => (
              <Text category="c1" style={[style, { fontStyle: 'italic' }]}>
                {description}
              </Text>
            )
          : null
      }
      onPress={onPress}
      style={[styles.listItem, style]}
    />
  );
}

MyListItem.propTypes = {
  item: propTypes.oneOfType([propTypes.string, propTypes.object]).isRequired,
  onSelectItem: propTypes.func.isRequired,
  selected: propTypes.bool.isRequired,
  itemToString: propTypes.func.isRequired,
  itemToKey: propTypes.func.isRequired,
  displayPhoto: propTypes.bool,
};

// eslint-disable-next-line no-func-assign
MyListItem = React.memo(MyListItem);

const commonItemToString = itemPropOrString(COMMON);
const idItemToString = itemPropOrString(ID);

export default function SearchList({
  value,
  onChange,
  placeholder,
  items,
  style,
  itemToString = commonItemToString,
  itemToKey = idItemToString,
  displayPhotos = true,
  forceModal = false,
  clearable = true,
}) {
  // items could be species objects or strings
  const [filteredItems, setFilteredItems] = React.useState([]);
  const [inputValue, setInputValue] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    if (showModal) {
      searchInputRef.current?.focus();
    }
  }, [showModal]);

  const getFilter = (text) => {
    return (item) => {
      if (text === null) return false;

      return itemToString(item).toLowerCase().includes(text.toLowerCase());
    };
  };

  React.useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  const onChangeText = (text) => {
    setInputValue(text);
    let filteredItems = items.filter(getFilter(text));
    setFilteredItems(filteredItems);
  };

  const onSelectItem = useCallback(
    (item) => {
      onChange(item);

      setInputValue(itemToString(item));
      setFilteredItems([]);
      setShowModal(false);
    },
    [itemToString, onChange],
  );

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

  const { width } = useSafeAreaFrame();
  const { top, bottom } = useSafeAreaInsets();
  const modalStyle = {
    top,
    bottom,
    width: width - PADDING * 2,
  };

  const onValuePress = () => {
    onChangeText('');
    setShowModal(true);
  };

  const renderItem = React.useCallback(
    ({ item }) => (
      <MyListItem
        key={itemToKey(item)}
        item={item}
        onSelectItem={onSelectItem}
        selected={itemToKey(item) === itemToKey(value)}
        itemToString={itemToString}
        itemToKey={itemToKey}
        displayPhoto={displayPhotos}
      />
    ),
    [displayPhotos, itemToKey, itemToString, onSelectItem, value],
  );

  if (!items) {
    return null;
  }

  return (
    <View style={style}>
      {items.length > MIN_NUM_FOR_POPUP || forceModal ? (
        <>
          <Card onPress={onValuePress}>
            <View style={styles.innerValueContainer}>
              <Text style={valueStyle}>
                {typeof value === 'string' || itemToKey(value)
                  ? itemToString(value)
                  : `select ${a(placeholder.toLowerCase())}`}
              </Text>
              <ArrowIcon />
            </View>
          </Card>

          <Modal
            animationType="fade"
            visible={showModal}
            backdropStyle={{
              backgroundColor: theme['color-basic-transparent-600'],
            }}
            style={[styles.modal, modalStyle]}
          >
            <Input
              accessoryRight={clearable ? renderClearIcon : null}
              value={inputValue}
              placeholder={placeholder}
              onChangeText={onChangeText}
              ref={searchInputRef}
              style={styles.input}
            />
            <List
              data={filteredItems}
              ItemSeparatorComponent={Divider}
              renderItem={renderItem}
              keyboardShouldPersistTaps="always"
              style={{ backgroundColor: theme['color-basic-100'] }}
            />
          </Modal>
        </>
      ) : (
        items.map((item) => (
          <View key={itemToKey(item)}>
            <MyListItem
              item={item}
              onSelectItem={onSelectItem}
              selected={itemToKey(item) === itemToKey(value)}
              itemToString={itemToString}
              itemToKey={itemToKey}
              displayPhoto={displayPhotos}
            />
            <Divider />
          </View>
        ))
      )}
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
  // eslint-disable-next-line react-native/no-color-literals
  listItem: {
    borderColor: 'transparent',
    borderWidth: 2,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  input: { marginBottom: PADDING },
  // eslint-disable-next-line react-native/no-color-literals
  modal: {
    padding: PADDING,
    backgroundColor: 'white',
    borderRadius: PADDING,
    marginBottom: PADDING,
  },
});

SearchList.propTypes = {
  value: propTypes.oneOfType([propTypes.string, propTypes.object]),
  onChange: propTypes.func.isRequired,
  placeholder: propTypes.string,
  items: propTypes.array.isRequired,
  style: propTypes.object,
  itemToString: propTypes.func,
  itemToKey: propTypes.func,
  displayPhotos: propTypes.bool,
  forceModal: propTypes.bool,
  clearable: propTypes.bool,
};
