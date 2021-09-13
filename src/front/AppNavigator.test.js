import * as eva from '@eva-design/eva';
import { fireEvent, render } from '@testing-library/react-native';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import React from 'react';
import { View } from 'react-native';
import AppNavigator from './AppNavigator';
import { AuthContextProvider } from './auth/context';

/*
  This issue (https://github.com/callstack/react-native-testing-library/issues/379)
  seems to be the cause of the console.errors that we are getting in this test file.
  I've tried the promise-polyfill solution and it broke the tests completely.
  I'm not sure that switching to queryBy is the best solution either. For now, I'm going
  to just wait for the issue to be fixed.
*/
jest.mock('@storybook/react-native', () => ({
  getStorybookUI: jest.fn(),
  addDecorator: jest.fn(),
  configure: jest.fn(),
}));
describe('AppNavigator', () => {
  it('renders choose type screen correctly', async () => {
    const component = (
      <ApplicationProvider {...eva} theme={eva.light}>
        <AuthContextProvider>
          <AppNavigator />
        </AuthContextProvider>
      </ApplicationProvider>
    );
    const { findAllByRole } = render(component);

    const buttons = await findAllByRole('button');
    expect(buttons.length).toBe(3);
  });
  it('filters the auth options appropriately for public', async () => {
    const component = (
      // if I use a fragment rather than a view below, the press event chokes
      <View>
        <IconRegistry icons={EvaIconsPack} />
        <ApplicationProvider {...eva} theme={eva.light}>
          <AuthContextProvider>
            <AppNavigator />
          </AuthContextProvider>
        </ApplicationProvider>
      </View>
    );
    const { findByText, findAllByAccessibilityLabel } = render(component);

    const publicButton = await findByText(/public/);
    fireEvent.press(publicButton);

    const authButtons = await findAllByAccessibilityLabel(/sign in/i);

    expect(authButtons.length).toBe(3);
  });
  it('filters the auth options appropriately for contractor', async () => {
    const component = (
      // if I use a fragment rather than a view below, the press event chokes
      <View>
        <IconRegistry icons={EvaIconsPack} />
        <ApplicationProvider {...eva} theme={eva.light}>
          <AuthContextProvider>
            <AppNavigator />
          </AuthContextProvider>
        </ApplicationProvider>
      </View>
    );
    const { findByText, findAllByAccessibilityLabel } = render(component);

    const button = await findByText(/contractor/);
    fireEvent.press(button);

    const authButtons = await findAllByAccessibilityLabel(/sign in/i);

    expect(authButtons.length).toBe(1);
  });
  it('filters the auth options appropriately for agency', async () => {
    const component = (
      // if I use a fragment rather than a view below, the press event chokes
      <View>
        <IconRegistry icons={EvaIconsPack} />
        <ApplicationProvider {...eva} theme={eva.light}>
          <AuthContextProvider>
            <AppNavigator />
          </AuthContextProvider>
        </ApplicationProvider>
      </View>
    );
    const { findByText, findAllByAccessibilityLabel } = render(component);

    const button = await findByText(/agency/);
    fireEvent.press(button);

    const authButtons = await findAllByAccessibilityLabel(/sign in/i);

    expect(authButtons.length).toBe(1);
  });
});
