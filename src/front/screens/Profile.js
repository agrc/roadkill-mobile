import { Button, Card, Divider, Input, Layout, Text } from '@ui-kitten/components';
import commonConfig from 'common/config';
import { Formik } from 'formik';
import React, { useRef } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import * as Sentry from 'sentry-expo';
import * as yup from 'yup';
import 'yup-phone';
import useAuth from '../auth/context';
import MyPhoneInput from '../components/MyPhoneInput';
import SearchList from '../components/reports/SearchList';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import { useAPI } from '../services/api';
import config from '../services/config';
import { getConstants } from '../services/constants';
import { PADDING } from '../services/styles';
import { booleanToYesNo, dateToString } from '../services/utilities';

// TODO: A lot of this code could be shared with NewUser.js
export default function ProfileScreen() {
  const [organizationsLookup, setOrganizationsLookup] = React.useState([]);
  const { userType } = useAuth();

  React.useEffect(() => {
    const init = async () => {
      const constants = await getConstants();
      const orgs = constants.organizations.filter((org) => org.org_type === userType);
      orgs.push(commonConfig.otherOrg);

      setOrganizationsLookup(orgs);
    };

    init();
  }, []);

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
  if (data?.organization_id) {
    shape.organization_name = yup.string().required();
    shape.organization_id = yup.number().required();
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
                  organization_id: data.organization_id,
                  organization_name: data.organization_name,
                  organization_type: userType,
                }}
                onSubmit={(values) => {
                  mutation.mutate(values);
                }}
                validationSchema={schema}
              >
                {({ values, handleChange, handleBlur, handleSubmit, dirty, errors, isValid, setValues, touched }) => (
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
                    {data.organization_id !== null ? (
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
                            const newValues = {
                              ...values,
                              organization_id: item?.id,
                              organization_name: item?.id === commonConfig.otherOrg.id ? null : item?.name,
                            };
                            setValues(newValues);
                          }}
                          items={organizationsLookup}
                          placeholder="Organization"
                          itemToString={(item) => item?.name}
                          itemToKey={(item) => item?.id}
                          displayPhotos={false}
                          forceModal={true}
                          style={styles.padded}
                          clearable={false}
                        />
                        {values.organization_id === commonConfig.otherOrg.id ? (
                          <Input
                            accessibilityRole="text"
                            style={[styles.input, styles.padded]}
                            label="Add New Organization"
                            caption={
                              errors.organization_name && touched.organization_name ? errors.organization_name : null
                            }
                            textContentType="organizationName"
                            value={
                              values.organization_name !== commonConfig.otherOrg.name ? values.organization_name : ''
                            }
                            onChangeText={handleChange('organization_name')}
                            onBlur={handleBlur('organization_name')}
                            status={errors.organization_name ? 'danger' : null}
                          />
                        ) : null}
                      </>
                    ) : null}
                    <Button
                      style={styles.button}
                      onPress={handleSubmit}
                      disabled={!dirty || !isValid || mutation.isLoading}
                    >
                      Update
                    </Button>
                    {/* {__DEV__ ? (
                      <>
                        <Text category="c1">
                          [The below text is only for debugging the values sent to the database. It will not show up in
                          production.]
                        </Text>
                        <Text>errors: {JSON.stringify(errors, null, '  ')}</Text>
                        <Text>values: {JSON.stringify(values, null, '  ')}</Text>
                        <Text>touched: {JSON.stringify(touched, null, '  ')}</Text>
                      </>
                    ) : null} */}
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
  label: {
    marginBottom: PADDING / 2,
  },
});
