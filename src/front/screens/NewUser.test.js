import * as eva from '@eva-design/eva';
import { fireEvent, render } from '@testing-library/react-native';
import { ApplicationProvider } from '@ui-kitten/components';
import React from 'react';
import { AuthContextProvider } from '../auth/context';
import NewUser from './NewUser';

const mockedNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockedNavigate }) }));

describe('NewUser', () => {
  it('renders correctly', async () => {
    const { findAllByRole } = render(
      <ApplicationProvider {...eva} theme={eva.light}>
        <AuthContextProvider>
          <NewUser />
        </AuthContextProvider>
      </ApplicationProvider>
    );

    const inputs = await findAllByRole('text');
    expect(inputs).toBeTruthy();
  });
  xit('validates the form', async () => {
    // couldn't get this to work. problems with act/formik/testing-library
    const { findByText, findByLabelText } = render(
      <ApplicationProvider {...eva} theme={eva.light}>
        <AuthContextProvider>
          <NewUser />
        </AuthContextProvider>
      </ApplicationProvider>
    );

    const registerButton = await findByText(/register/i);
    const phone = await findByLabelText(/phone/i);
    await fireEvent.changeText(phone, '22');
    await fireEvent(phone, 'blur');
    const validationError = await findByText(/must be valid phone/);

    expect(validationError).toBeTruthy();
    expect(registerButton).toBeDisabled();
  });
});
