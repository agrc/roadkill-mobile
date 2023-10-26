import { Divider, Tab, TabBar, Text, Toggle } from '@ui-kitten/components';
import { omit } from 'lodash';
import propTypes from 'prop-types';
import React, { memo, useEffect } from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useImmerReducer } from 'use-immer';
import config from '../../services/config';
import { getConstants } from '../../services/constants';
import { PADDING } from '../../services/styles';
import { useMounted } from '../../services/utilities';
import RadioPills from './RadioPills';
import SearchList from './SearchList';

const FREQUENT = 'often reported';
const COMMON = 'common name';
const ORDER = 'order';
const CLASS = 'class';
const FAMILY = 'family';
const SEARCH_TYPES = [FREQUENT, COMMON, CLASS, ORDER, FAMILY];
const SEARCH_TYPE_TO_FIELD = {
  [COMMON]: 'common_name',
  [ORDER]: 'species_order',
  [CLASS]: 'species_class',
  [FAMILY]: 'family',
};
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];
const CLASS_DESCRIPTION_TO_VALUE = {
  hair: 'mammals',
  feathers: 'birds',
  scales: 'reptiles',
  slime: 'amphibians',
  [config.UNKNOWN]: config.UNKNOWN,
};
const RARE_SPECIES_WARNING =
  'The species you selected is rare in this area. Please consider this selection carefully before submitting your report, or select a different species.';

// utility functions
function dedupe(array) {
  return [...new Set(array)];
}

function sortBy(key) {
  return (a, b) => {
    return a[key].localeCompare(b[key]);
  };
}

const initialState = {
  searchType: SEARCH_TYPES[0],
  autoCompleteItems: null,
  filterValue: null,
  value: {
    species_id: null,
    common_name: null,
    scientific_name: null,
    species_type: null,
    species_class: null,
    species_order: null,
    family: null,
    species_confidence_level: null,
  },
  constants: {
    species: null,
    frequentSpecies: null,
  },
};

const reducer = (draft, action) => {
  const reset = () => {
    draft.filterValue = initialState.filterValue;

    // the spread helps immer when we modify one of the values after calling reset
    draft.value = { ...initialState.value };
  };

  switch (action.type) {
    case 'SET_SPECIES': {
      draft.constants.species = action.payload;
      draft.constants.frequentSpecies = action.payload.filter(
        (item) => item.frequent,
      );

      break;
    }

    case 'SELECT_SPECIES': {
      if (
        typeof action.payload === 'string' &&
        action.payload.toLowerCase() === config.UNKNOWN.toLowerCase()
      ) {
        draft.value.species_id = null;
        draft.value.common_name = config.UNKNOWN;
        draft.value.scientific_name = config.UNKNOWN;
        draft.value.species_type = config.UNKNOWN;
      } else {
        const selectedItem = { ...action.payload };

        if (selectedItem) {
          draft.value = selectedItem;

          if (selectedItem.rare) {
            Alert.alert('Warning', RARE_SPECIES_WARNING);
          }
        } else {
          draft.value = initialState.value;
        }
      }

      draft.value.species_confidence_level = null;

      break;
    }

    case 'CHANGE_SEARCH_TYPE':
      reset();

      draft.searchType = action.payload;

      if ([ORDER, CLASS, FAMILY].includes(action.payload)) {
        const newValues = draft.constants.species
          .map((item) => item[SEARCH_TYPE_TO_FIELD[draft.searchType]])
          .filter((value) => value);

        draft.autoCompleteItems = dedupe(newValues).sort();
      } else if (action.payload === COMMON) {
        draft.autoCompleteItems = Array.from(draft.constants.species).sort(
          sortBy('common_name'),
        );
      }

      break;

    case 'SET_FILTER':
      reset();

      draft.filterValue = action.payload;

      break;

    case 'SET_SELECTED_CLASS':
      reset();

      draft.value.species_class = action.payload;
      if (draft.value.species_class === config.UNKNOWN) {
        draft.value.common_name = config.UNKNOWN;
        draft.value.scientific_name = config.UNKNOWN;
        draft.value.species_type = config.UNKNOWN;
        draft.value.species_order = config.UNKNOWN;
        draft.value.family = config.UNKNOWN;
      }

      break;

    case 'SET_FAMILY':
      draft.value.family = action.payload;
      draft.value.common_name = null;
      draft.value.scientific_name = null;
      draft.value.species_type = null;
      draft.value.species_order = null;

      if (draft.value.family === config.UNKNOWN) {
        draft.value.common_name = config.UNKNOWN;
        draft.value.scientific_name = config.UNKNOWN;
        draft.value.species_type = config.UNKNOWN;
        draft.value.species_order = config.UNKNOWN;
      }

      break;

    case 'SET_CONFIDENCE_LEVEL':
      draft.value.species_confidence_level = action.payload;

      break;

    case 'RESET':
      reset();
      draft.searchType = SEARCH_TYPES[0];

      break;

    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
};

function Species({
  onChange,
  style,
  ableToIdentify,
  setAbleToIdentify,
  reset,
}) {
  const [state, dispatch] = useImmerReducer(reducer, initialState);
  const isMounted = useMounted();

  useEffect(() => {
    const init = async () => {
      const constants = await getConstants();

      if (isMounted) {
        dispatch({ type: 'SET_SPECIES', payload: constants.species });
      }
    };

    init();
  }, []);

  React.useEffect(() => {
    if (reset) {
      dispatch({ type: 'RESET' });
    }
  }, [reset]);

  React.useEffect(() => {
    // exclude fields that are not part of the report_info table
    onChange(omit(state.value, ['rare', 'frequent']));
  }, [state.value]);

  const renderSearch = () => {
    switch (state.searchType) {
      case FREQUENT:
        return (
          <SearchList
            value={state.value}
            onChange={(item) =>
              dispatch({ type: 'SELECT_SPECIES', payload: item })
            }
            items={state.constants.frequentSpecies}
          />
        );

      case COMMON:
        return (
          <SearchList
            value={state.value}
            onChange={(item) =>
              dispatch({ type: 'SELECT_SPECIES', payload: item })
            }
            items={state.autoCompleteItems}
            placeholder="common name"
          />
        );

      case ORDER:
      case CLASS:
      case FAMILY:
        return (
          <>
            <SearchList
              value={state.filterValue}
              onChange={(value) =>
                dispatch({ type: 'SET_FILTER', payload: value })
              }
              items={state.autoCompleteItems}
              placeholder={`${state.searchType} name`}
              style={{ marginBottom: PADDING }}
            />
            {state.filterValue ? (
              <>
                <Text category="h6">Select a species:</Text>
                <SearchList
                  value={state.value}
                  onChange={(item) =>
                    dispatch({ type: 'SELECT_SPECIES', payload: item })
                  }
                  items={state.constants.species
                    .filter(
                      (item) =>
                        item[
                          SEARCH_TYPE_TO_FIELD[state.searchType]
                        ]?.toLowerCase() === state.filterValue.toLowerCase(),
                    )
                    .sort(sortBy('common_name'))}
                  placeholder={state.filterValue}
                />
              </>
            ) : null}
          </>
        );

      default:
        throw new Error(`Unknown search type: ${state.searchType}!`);
    }
  };

  const { width } = useWindowDimensions();
  const shrinkTabText = width < 380;
  const tabTextStyle = shrinkTabText ? { fontSize: 12 } : {};

  return state.constants.species ? (
    <View style={style}>
      <Text category="h6" style={{ marginTop: PADDING }}>
        Are you able to identify the species?
      </Text>
      <View style={styles.toggleContainer}>
        <Toggle
          checked={ableToIdentify}
          onChange={() => {
            setAbleToIdentify(!ableToIdentify);
            dispatch({ type: 'RESET' });
          }}
          style={styles.toggle}
        >
          {ableToIdentify ? 'Yes' : 'No'}
        </Toggle>
      </View>
      {ableToIdentify ? (
        <>
          <TabBar
            selectedIndex={SEARCH_TYPES.indexOf(state.searchType)}
            onSelect={(index) =>
              dispatch({
                type: 'CHANGE_SEARCH_TYPE',
                payload: SEARCH_TYPES[index],
              })
            }
          >
            {SEARCH_TYPES.map((type) => (
              <Tab
                key={type}
                title={({ category, style }) => (
                  <Text category={category} style={[style, tabTextStyle]}>
                    {type}
                  </Text>
                )}
              />
            ))}
          </TabBar>
          <View style={styles.searchContainer}>
            <Divider />
            {renderSearch()}
          </View>
          {state.value.species_id ? (
            <>
              <Text category="h6">
                How confident are you in your species identification?
              </Text>
              <RadioPills
                value={state.value.species_confidence_level}
                onChange={(value) =>
                  dispatch({ type: 'SET_CONFIDENCE_LEVEL', payload: value })
                }
                options={CONFIDENCE_LEVELS}
              />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Text category="h6">Does the animal have...</Text>
          <SearchList
            value={
              Object.keys(CLASS_DESCRIPTION_TO_VALUE).filter(
                (key) =>
                  CLASS_DESCRIPTION_TO_VALUE[key].toLowerCase() ===
                  state.value.species_class?.toLowerCase(),
              )[0]
            }
            onChange={(value) =>
              dispatch({
                type: 'SET_SELECTED_CLASS',
                payload: CLASS_DESCRIPTION_TO_VALUE[value],
              })
            }
            items={Object.keys(CLASS_DESCRIPTION_TO_VALUE)}
          />

          {state.value.species_class &&
          state.value.species_class !== config.UNKNOWN ? (
            <View style={styles.marginTop}>
              <Text category="h6">Does the animal look like a...</Text>
              <SearchList
                value={state.value.family}
                onChange={(value) =>
                  dispatch({ type: 'SET_FAMILY', payload: value })
                }
                items={dedupe(
                  state.constants.species
                    .filter(
                      (item) =>
                        item.species_class.toLowerCase() ===
                          state.value.species_class?.toLowerCase() &&
                        item.family !== config.UNKNOWN,
                    )
                    .map((item) => item.family),
                )
                  .sort()
                  .concat([config.UNKNOWN])}
                placeholder={state.value.family}
              />
            </View>
          ) : null}

          {state.value.species_class &&
          state.value.species_class !== config.UNKNOWN &&
          state.value.family &&
          state.value.family !== config.UNKNOWN ? (
            <View style={styles.marginTop}>
              <Text category="h6">Select a species:</Text>
              <SearchList
                value={
                  state.value.common_name?.toLowerCase() ===
                  config.UNKNOWN.toLowerCase()
                    ? config.UNKNOWN
                    : state.value
                }
                onChange={(item) =>
                  dispatch({ type: 'SELECT_SPECIES', payload: item })
                }
                items={state.constants.species
                  .filter(
                    (item) =>
                      item.family.toLowerCase() ===
                      state.value.family.toLowerCase(),
                  )
                  .sort(sortBy('common_name'))
                  .concat([config.UNKNOWN])}
                placeholder="common name"
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  ) : null;
}
export default memo(Species);

Species.propTypes = {
  ableToIdentify: propTypes.bool.isRequired,
  onChange: propTypes.func.isRequired,
  reset: propTypes.bool.isRequired,
  setAbleToIdentify: propTypes.func.isRequired,
  style: propTypes.object,
};

const styles = StyleSheet.create({
  toggle: {
    marginTop: PADDING / 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: PADDING,
  },
  searchContainer: {
    marginTop: PADDING,
    marginBottom: PADDING,
  },
  marginTop: {
    marginTop: PADDING,
  },
});
