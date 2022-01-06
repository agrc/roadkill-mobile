import { Button, Card, Divider, Input, Layout, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import React, { useRef } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import * as Sentry from 'sentry-expo';
import * as yup from 'yup';
import 'yup-phone';
import MyPhoneInput from '../components/MyPhoneInput';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import { useAPI } from '../services/api';
import config from '../services/config';
import { PADDING } from '../services/styles';
import { booleanToYesNo, dateToString } from '../services/utilities';

export default function ProfileScreen() {
  const { get, post } = useAPI();

  const getProfileData = async () => {
    const responseJson = await get('user/profile');

    return responseJson.profile;
  };
  const { data, isLoading, isError, error } = useQuery(config.QUERY_KEYS.profile, getProfileData);

  const updateProfileData = async (newData) => {
    await post('user/profile/update', newData);
  };

  const formikRef = useRef();
  const queryClient = useQueryClient();
  const mutation = useMutation(updateProfileData, {
    onSuccess: () => {
      Alert.alert('Success', 'Profile updated successfully!');

      queryClient.invalidateQueries(config.QUERY_KEYS.profile);

      formikRef.current.resetForm({
        values: formikRef.current.values,
      });
    },
    onError: (error) => {
      Sentry.Native.captureException(error);

      Alert.alert('Error', 'Error updating profile!');
    },
  });

  const shape = {
    phone: yup.string().phone('US').required(),
  };
  if (data?.organization) {
    shape.organization = yup.string().required();
  }
  const schema = yup.object().shape(shape);

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.container}>
        {isError ? (
          <Card status="danger" style={styles.errorCard}>
            <Text>There was an error retrieving your profile from the server!</Text>
            <Text>{error?.message}</Text>
          </Card>
        ) : null}
        {data ? (
          <>
            <View style={{ padding: PADDING }}>
              <Input
                label="Name (from sign-in provider)"
                value={`${data.first_name} ${data.last_name}`}
                disabled
                style={styles.padded}
              />
              <Input label="Email (from sign-in provider)" value={`${data.email}`} disabled style={styles.padded} />
              <Formik
                innerRef={formikRef}
                initialValues={{
                  phone: data.phone,
                  organization: data.organization,
                }}
                onSubmit={(values) => {
                  mutation.mutate(values);
                }}
                validationSchema={schema}
              >
                {({ values, handleChange, handleBlur, handleSubmit, dirty, errors, isValid }) => (
                  <>
                    <MyPhoneInput
                      accessibilityRole="text"
                      accessibilityLabel="phone"
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      label="Phone"
                      value={values.phone}
                      style={styles.padded}
                      onChange={handleChange('phone')}
                      onBlur={handleBlur('phone')}
                      status={errors.phone ? 'danger' : null}
                    />
                    {data.organization !== null ? (
                      <Input
                        accessibilityRole="text"
                        accessibilityLabel="organization"
                        label="Organization"
                        value={values.organization}
                        style={styles.padded}
                        onChangeText={handleChange('organization')}
                        onBlur={handleBlur('organization')}
                        status={errors.organization ? 'danger' : null}
                      />
                    ) : null}
                    <Button
                      style={styles.button}
                      onPress={handleSubmit}
                      disabled={!dirty || !isValid || mutation.isLoading}
                    >
                      Update
                    </Button>
                  </>
                )}
              </Formik>

              <Text category="h5">Other Information</Text>
            </View>
            <Divider />
            <ValueContainer label="Approved" value={booleanToYesNo(data.approved)} />
            <ValueContainer label="Registered Date" value={dateToString(data.registered_date)} />
            <ValueContainer label="Role" value={data.role} />
            <ValueContainer label="Sign-in Provider" value={data.auth_provider} />
            <ValueContainer label="Total Reports Submitted" value={data.reports_submitted} />
          </>
        ) : null}
      </ScrollView>
      <Spinner show={isLoading} message={'Loading profile...'} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  padded: {
    marginBottom: PADDING,
  },
  button: {
    marginBottom: PADDING * 2,
  },
});
