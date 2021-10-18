import { Tab, TabBar, Text, Toggle } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useImmerReducer } from 'use-immer';
import { PADDING } from '../../styles';
import RadioPills from './RadioPills';
import SearchList from './SearchList';
import species from './species.json';

const FREQUENT = 'frequent';
const COMMON = 'common';
const ORDER = 'order';
const CLASS = 'class';
const FAMILY = 'family';
const SEARCH_TYPES = [FREQUENT, COMMON, CLASS, ORDER, FAMILY];
const frequentSpecies = species.filter((speciesItem) => speciesItem.frequent).map(specieToOption);
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];
const ATTRIBUTES = [
  { label: 'hair', value: 'mammal' },
  { label: 'feathers', value: 'bird' },
  { label: 'scales', value: 'reptile' },
  { label: 'slime', value: 'amphibian' },
];
const UNKNOWN = 'unknown';
const UNKNOWN_SPECIES = {
  latin: UNKNOWN,
  common: 'Unknown',
};

// utility functions
function getSpeciesByLatin(latin) {
  return species.concat([UNKNOWN_SPECIES]).find((speciesItem) => speciesItem.latin === latin);
}

function dedupe(array) {
  return Array.from(new Set(array));
}

function dedupeBy(array, key) {
  const keys = [];

  return array.filter((item) => {
    if (keys.includes(item[key])) {
      return false;
    }

    keys.push(item[key]);

    return true;
  });
}

function specieToOption(specie) {
  return {
    label: specie.common,
    value: specie.latin,
  };
}

function sortBy(key) {
  return (a, b) => {
    return a[key].localeCompare(b[key]);
  };
}

function reducer(draft, action) {
  const reset = () => {
    draft.selectedSpecies = null;
    draft.filterValue = null;
    draft.selectedClass = null;
    draft.family = null;
    draft.confidenceLevel = null;
    draft.speciesValue = null;
  };

  switch (action.type) {
    case 'SELECT_SPECIES': {
      const selectedItem = action.payload;

      draft.selectedSpecies = selectedItem;

      if (selectedItem) {
        draft.speciesValue =
          selectedItem.latin !== UNKNOWN_SPECIES.latin
            ? selectedItem.latin
            : `${draft.selectedClass}-${draft.family}-${selectedItem.latin}`.toLowerCase();
      } else {
        // this is set to undefined to prevent the entire component from being reset
        draft.speciesValue = undefined;
      }

      draft.confidenceLevel = null;

      break;
    }

    case 'CHANGE_SEARCH_TYPE':
      draft.searchType = action.payload;

      reset();

      if ([ORDER, CLASS, FAMILY].includes(action.payload)) {
        const newValues = species.map((speciesItem) => speciesItem[draft.searchType]).filter((value) => value);

        draft.autoCompleteItems = dedupe(newValues).sort();
      } else if (action.payload === COMMON) {
        draft.autoCompleteItems = Array.from(species).sort(sortBy(COMMON));
      }

      break;

    case 'SET_FILTER':
      reset();

      // this is set to undefined to prevent the entire component from being reset
      draft.speciesValue = undefined;
      draft.filterValue = action.payload;

      break;

    case 'SWITCH_ABLE_TO_IDENTIFY':
      draft.ableToIdentify = !draft.ableToIdentify;

      reset();

      break;

    case 'SET_SELECTED_CLASS':
      reset();

      // this is set to undefined to prevent the entire component from being reset
      draft.speciesValue = undefined;
      draft.selectedClass = action.payload;

      if (action.payload === UNKNOWN) {
        draft.speciesValue = UNKNOWN;
      }

      break;

    case 'SET_FAMILY':
      draft.family = action.payload;
      draft.selectedSpecies = null;

      // this is set to undefined to prevent the entire component from being reset
      draft.speciesValue = undefined;
      if (action.payload === UNKNOWN) {
        draft.speciesValue = `${draft.selectedClass}-${action.payload}`.toLowerCase();
      }

      break;

    case 'SET_CONFIDENCE_LEVEL':
      draft.confidenceLevel = action.payload;

      break;

    case 'RESET':
      reset();

      break;

    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}

const initialState = {
  ableToIdentify: true,
  searchType: SEARCH_TYPES[0],
  selectedSpecies: null,
  autoCompleteItems: null,
  filterValue: null,
  selectedClass: null,
  family: null,
  confidenceLevel: null,
  speciesValue: null,
};

export default function Species({ onChange, values }) {
  const [state, dispatch] = useImmerReducer(reducer, initialState);
  const families = dedupeBy(
    species
      .filter((item) => item.class.toLowerCase() === state.selectedClass?.toLowerCase())
      .map((speciesItem) => {
        return {
          label: speciesItem.family.replace(/s$/, ''),
          value: speciesItem.family,
        };
      }),
    'label'
  )
    .sort(sortBy('label'))
    .concat([{ label: 'Unknown', value: UNKNOWN }]);

  React.useEffect(() => {
    if (values.species === null && values.species_confidence_level === null) {
      dispatch({ type: 'RESET' });
    }
  }, [values]);

  React.useEffect(() => {
    console.log('Species mounted');

    if (__DEV__ && !process.env.JEST_WORKER_ID) {
      // check for duplicates in species data
      const checkForDuplicates = (key) => {
        const speciesList = species.map((specie) => specie[key]);
        const duplicates = speciesList.filter((item, index) => speciesList.indexOf(item) !== index);
        if (duplicates.length > 0) {
          console.warn('Duplicate species found: ', duplicates);
        }
      };

      checkForDuplicates(COMMON);
      checkForDuplicates('latin');
    }

    return () => {
      console.log('Species unmounted');
    };
  }, []);

  React.useEffect(() => {
    onChange({
      species: state.speciesValue,
      species_confidence_level: state.confidenceLevel,
    });
  }, [state.confidenceLevel, state.speciesValue]);

  const renderSearch = () => {
    switch (state.searchType) {
      case FREQUENT:
        return (
          <RadioPills
            value={state.selectedSpecies?.latin}
            onChange={(latin) => dispatch({ type: 'SELECT_SPECIES', payload: getSpeciesByLatin(latin) })}
            options={frequentSpecies}
          />
        );

      case COMMON:
        return (
          <SearchList
            value={state.selectedSpecies}
            onChange={(specie) => dispatch({ type: 'SELECT_SPECIES', payload: specie })}
            items={state.autoCompleteItems}
            field={COMMON}
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
              onChange={(value) => dispatch({ type: 'SET_FILTER', payload: value })}
              items={state.autoCompleteItems}
              placeholder={`${state.searchType} name`}
              style={{ marginBottom: PADDING }}
            />
            {state.filterValue ? (
              <RadioPills
                value={state.selectedSpecies?.latin}
                onChange={(latin) => dispatch({ type: 'SELECT_SPECIES', payload: getSpeciesByLatin(latin) })}
                options={species
                  .filter((speciesItem) => speciesItem[state.searchType] === state.filterValue)
                  .map(specieToOption)}
              />
            ) : null}
          </>
        );

      default:
        throw new Error(`Unknown search type: ${state.searchType}!`);
    }
  };

  return (
    <>
      <Text category="h6" style={{ marginTop: PADDING }}>
        Are you able to identify the species?
      </Text>
      <View style={styles.toggleContainer}>
        <Toggle
          checked={state.ableToIdentify}
          onChange={() => dispatch({ type: 'SWITCH_ABLE_TO_IDENTIFY' })}
          style={styles.toggle}
        >
          {state.ableToIdentify ? 'Yes' : 'No'}
        </Toggle>
      </View>
      {state.ableToIdentify ? (
        <>
          <Text category="label">Search by...</Text>
          <TabBar
            selectedIndex={SEARCH_TYPES.indexOf(state.searchType)}
            onSelect={(index) => dispatch({ type: 'CHANGE_SEARCH_TYPE', payload: SEARCH_TYPES[index] })}
          >
            {SEARCH_TYPES.map((type) => (
              <Tab key={type} title={type} />
            ))}
          </TabBar>
          {renderSearch()}
          {state.selectedSpecies ? (
            <>
              <Text category="h6" style={{ marginTop: PADDING }}>
                How confident are you in your species identification?
              </Text>
              <RadioPills
                value={state.confidenceLevel}
                onChange={(value) => dispatch({ type: 'SET_CONFIDENCE_LEVEL', payload: value })}
                options={CONFIDENCE_LEVELS}
              />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Text category="h6">Does the animal have...</Text>
          <RadioPills
            value={state.selectedClass}
            onChange={(value) => dispatch({ type: 'SET_SELECTED_CLASS', payload: value })}
            options={ATTRIBUTES}
          />

          {state.selectedClass && state.selectedClass !== UNKNOWN ? (
            <>
              <Text category="h6">Does the animal look like a...</Text>
              <RadioPills
                value={state.family}
                onChange={(value) => dispatch({ type: 'SET_FAMILY', payload: value })}
                options={families}
              />
            </>
          ) : null}

          {state.selectedClass && state.selectedClass !== UNKNOWN && state.family && state.family !== UNKNOWN ? (
            <>
              <Text category="h6">Select a species...</Text>
              <RadioPills
                value={state.selectedSpecies?.latin}
                onChange={(latin) => dispatch({ type: 'SELECT_SPECIES', payload: getSpeciesByLatin(latin) })}
                options={species
                  .filter((speciesItem) => speciesItem.family.toLowerCase() === state.family.toLowerCase())
                  .concat(UNKNOWN_SPECIES)
                  .map(specieToOption)}
              />
            </>
          ) : null}
        </>
      )}
    </>
  );
}

Species.propTypes = {
  onChange: propTypes.func.isRequired,
  values: propTypes.object.isRequired,
};

const styles = StyleSheet.create({
  toggle: {
    marginVertical: PADDING,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
