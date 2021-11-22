import { useNavigation } from '@react-navigation/native';
import { Button, Input, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useMutation } from 'react-query';
import * as yup from 'yup';
import 'yup-phone';
import useAuth from '../auth/context';
import MyPhoneInput from '../components/MyPhoneInput';
import RootView from '../components/RootView';
import config from '../services/config';

export default function NewUserScreen() {
  const { logOut, userType, authInfo, registerUser } = useAuth();
  const navigation = useNavigation();
  const organizationIsRequired = userType !== config.USER_TYPES.public;
  const registerMutation = useMutation('register', registerUser);

  const shape = {
    phone: yup.string().phone('US').required(),
  };
  if (organizationIsRequired) {
    shape.organization = yup.string().required();
  }
  const schema = yup.object().shape(shape);

  const register = async ({ phone, organization }) => {
    await registerMutation.mutate({
      user: {
        phone,
        first_name: authInfo.oauthUser.given_name,
        last_name: authInfo.oauthUser.family_name,
        email: authInfo.oauthUser.email,
        auth_id: authInfo.oauthUser.sub,
        auth_provider: authInfo.providerName,
        role: userType,
      },
      organization: organizationIsRequired
        ? {
            name: organization,
            org_type: userType,
          }
        : null,
    });
  };

  const cancel = () => {
    navigation.navigate('choose-type');
    logOut(true);
  };

  return (
    <RootView showSpinner={registerMutation.isLoading}>
      <ScrollView style={styles.layout}>
        <Text category="h1">Please complete your profile</Text>

        <Formik
          initialValues={{ phone: null, organization: null }}
          validationSchema={schema}
          onSubmit={register}
          isSubmitting={registerMutation.isLoading}
        >
          {({ values, handleChange, handleBlur, handleSubmit, errors, isValid, touched, dirty }) => (
            <>
              <View style={styles.inputsContainer}>
                <Input style={styles.input} label="Name" value={authInfo?.oauthUser.name} disabled />
                <Input style={styles.input} label="Email" value={authInfo?.oauthUser.email} disabled />
                {organizationIsRequired ? (
                  <Input
                    accessibilityRole="text"
                    style={styles.input}
                    label="Organization"
                    caption={errors.organization && touched.email ? errors.organization : null}
                    textContentType="organizationName"
                    value={values.organization}
                    onChangeText={handleChange('organization')}
                    onBlur={handleBlur('organization')}
                    status={errors.organization ? 'danger' : null}
                  />
                ) : null}
                <MyPhoneInput
                  accessibilityRole="text"
                  style={styles.input}
                  label="Phone"
                  accessibilityLabel="phone"
                  caption={errors.phone && touched.phone ? errors.phone : null}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  value={values.phone}
                  onChange={handleChange('phone')}
                  onBlur={handleBlur('phone')}
                  status={errors.phone ? 'danger' : null}
                />
              </View>
              <Button
                onPress={handleSubmit}
                style={styles.input}
                disabled={!dirty || !isValid || registerMutation.isLoading}
              >
                Register
              </Button>
            </>
          )}
        </Formik>
        <Button onPress={cancel} style={styles.input} status="warning" appearance="outline">
          Cancel
        </Button>
      </ScrollView>
    </RootView>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, padding: 25 },
  inputsContainer: { marginVertical: 25 },
  input: { marginVertical: 5 },
});
