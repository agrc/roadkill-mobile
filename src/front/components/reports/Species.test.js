import { produce } from 'immer';
import { initialState, reducer } from './Species';

jest.mock('../../services/constants', () => ({ getConstants: jest.fn() }));

const dispatch = (state, action) =>
  produce(state, (draft) => reducer(draft, action));

describe('Species reducer', () => {
  it('clears a selected species without mutating the initial state', () => {
    const elk = { species_id: 2, common_name: 'Elk', rare: false };
    let state = dispatch(initialState, {
      type: 'SELECT_SPECIES',
      payload: elk,
    });
    state = dispatch(state, { type: 'SELECT_SPECIES', payload: null });

    expect(state.value.species_id).toBe(initialState.value.species_id);
    expect(state.value.species_confidence_level).toBeNull();
    // sharing initialState.value lets immer freeze it, so the next write to
    // the cleared value throws "Cannot assign to read-only property"
    expect(state.value).not.toBe(initialState.value);
  });
});
