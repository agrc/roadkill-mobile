import { useNavigation } from '@react-navigation/native';
import { Button, Input, Text } from '@ui-kitten/components';
import commonConfig from 'common/config';
import { Formik } from 'formik';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation } from 'react-query';
import * as Sentry from 'sentry-expo';
import * as yup from 'yup';
import 'yup-phone';
import useAuth from '../auth/context';
import MyPhoneInput from '../components/MyPhoneInput';
import SearchList from '../components/reports/SearchList';
import RootView from '../components/RootView';
import config from '../services/config';
import { getConstants } from '../services/constants';
import { PADDING } from '../services/styles';

// TODO: A lot of this code could be shared with Profile.js
export default function NewUserScreen() {
  const { logOut, userType, authInfo, registerUser } = useAuth();
  const navigation = useNavigation();
  const organizationIsRequired = userType !== config.USER_TYPES.public;
  const registerMutation = useMutation(registerUser, {
    onSuccess: () => {
      if (userType !== config.USER_TYPES.public) {
        Alert.alert(
          'Success',
          'Thank you for registering! Your registration has been sent to system administrators for approval. You will get an email once your account has been approved. Please note that you may still collect and submit data before your account is approved.'
        );
      }
    },
    onError: (error) => {
      Sentry.Native.captureException(error);

      Alert.alert('Error', 'Error submitting registration. Please try again later.');
    },
  });
  const [organizationsLookup, setOrganizationsLookup] = React.useState([]);

  React.useEffect(() => {
    const init = async () => {
      const constants = await getConstants();
      const orgs = constants.organizations.filter((org) => org.org_type === userType);
      orgs.push(commonConfig.otherOrg);

      setOrganizationsLookup(orgs);
    };

    init();
  }, []);

  const shape = {
    phone: yup.string().phone('US').required(),
  };
  if (organizationIsRequired) {
    shape.organization_name = yup.string().required();
    shape.organization_id = yup.number().required();
  }
  const schema = yup.object().shape(shape);

  const register = async ({ phone, organization_id, organization_name }) => {
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
            id: organization_id,
            name: organization_name,
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
          initialValues={{ phone: null, organization_id: null, organization_name: null }}
          validationSchema={schema}
          onSubmit={register}
          isSubmitting={registerMutation.isLoading}
        >
          {({ values, handleChange, handleBlur, handleSubmit, errors, isValid, touched, dirty, setValues }) => (
            <>
              <View style={styles.inputsContainer}>
                <Input style={styles.input} label="Name" value={authInfo?.oauthUser.name} disabled />
                <Input style={styles.input} label="Email" value={authInfo?.oauthUser.email} disabled />
                {organizationIsRequired ? (
                  <>
                    <Text category="label" appearance="hint" style={styles.label}>
                      Organization
                    </Text>
                    <SearchList
                      value={{
                        id: values.organization_id,
                        name:
                          values.organization_id === commonConfig.otherOrg.id
                            ? commonConfig.otherOrg.name
                            : values.organization_name,
                      }}
                      onChange={(item) => {
                        setValues({
                          ...values,
                          organization_id: item?.id,
                          organization_name: item?.id === commonConfig.otherOrg.id ? null : item?.name,
                        });
                      }}
                      items={organizationsLookup}
                      placeholder="Organization"
                      itemToString={(item) => item?.name}
                      itemToKey={(item) => item?.id}
                      displayPhotos={false}
                      forceModal={true}
                    />
                    {values.organization_id === commonConfig.otherOrg.id ? (
                      <Input
                        accessibilityRole="text"
                        style={styles.input}
                        label="Add New Organization"
                        caption={
                          errors.organization_name && touched.organization_name ? errors.organization_name : null
                        }
                        textContentType="organizationName"
                        value={values.organization_name !== commonConfig.otherOrg.name ? values.organization_name : ''}
                        onChangeText={handleChange('organization_name')}
                        onBlur={handleBlur('organization_name')}
                        status={errors.organization_name ? 'danger' : null}
                      />
                    ) : null}
                  </>
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
              <Button onPress={cancel} style={styles.input} appearance="ghost">
                Cancel
              </Button>
              {__DEV__ ? (
                <>
                  <Text category="c1">
                    [The below text is only for debugging the values sent to the database. It will not show up in
                    production.]
                  </Text>
                  <Text>errors: {JSON.stringify(errors, null, '  ')}</Text>
                  <Text>values: {JSON.stringify(values, null, '  ')}</Text>
                  <Text>touched: {JSON.stringify(touched, null, '  ')}</Text>
                </>
              ) : null}
            </>
          )}
        </Formik>
      </ScrollView>
    </RootView>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, padding: 25 },
  inputsContainer: { marginVertical: 25 },
  input: { marginVertical: PADDING / 2 },
  label: { marginBottom: PADDING / 2 },
});
