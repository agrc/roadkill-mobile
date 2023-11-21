import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Divider,
  Input,
  Layout,
  Text,
} from '@ui-kitten/components';
import commonConfig from 'common/config';
import { Formik } from 'formik';
import React, { useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Sentry from 'sentry-expo';
import { number, object, string } from 'yup';
import 'yup-phone-lite';
import useAuth from '../auth/context';
import MyPhoneInput from '../components/MyPhoneInput';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import SearchList from '../components/reports/SearchList';
import { useAPI } from '../services/api';
import config from '../services/config';
import { getConstants } from '../services/constants';
import t from '../services/localization';
import { PADDING } from '../services/styles';
import { booleanToYesNo, dateToString } from '../services/utilities';

// TODO: A lot of this code could be shared with NewUser.js
export default function ProfileScreen() {
  const [organizationsLookup, setOrganizationsLookup] = React.useState([]);
  const { userType, logOut } = useAuth();

  React.useEffect(() => {
    const init = async () => {
      const constants = await getConstants();
      const orgs = constants.organizations.filter(
        (org) => org.org_type === userType,
      );
      orgs.push(commonConfig.otherOrg);

      setOrganizationsLookup(orgs);
    };

    init();
  }, [userType]);

  const { get, post, deleteAccount } = useAPI();

  const getProfileData = async () => {
    const responseJson = await get('user/profile');

    return responseJson.profile;
  };
  const { data, isPending, isError, error } = useQuery({
    queryKey: [config.QUERY_KEYS.profile],
    queryFn: getProfileData,
  });

  const updateProfileData = async (newData) => {
    await post('user/profile/update', newData);
  };

  const formikRef = useRef();
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateProfileData,
    onSuccess: () => {
      Alert.alert(t('success'), t('screens.profile.updateSuccessful'));

      queryClient.invalidateQueries(config.QUERY_KEYS.profile);

      formikRef.current.resetForm({
        values: formikRef.current.values,
      });
    },
    onError: (error) => {
      Sentry.Native.captureException(error);

      Alert.alert(t('error'), t('screens.profile.updateError'));
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      Alert.alert(t('success'), t('screens.profile.deleteSuccessful'));

      logOut(true);
    },
    onError: (error) => {
      Sentry.Native.captureEvent(error);

      Alert.alert(t('error'), t('screens.profile.deleteError'));
    },
  });

  const handleDeleteAccountButton = () => {
    Alert.alert(t('areYouSure'), t('screens.profile.deleteAccountWarning'), [
      {
        text: t('cancel'),
        style: 'cancel',
      },
      {
        text: t('screens.profile.deleteAccountButton'),
        onPress: () => deleteAccountMutation.mutate(),
      },
    ]);
  };

  const shape = {
    phone: string().phone('US').required(),
  };
  if (data?.organization_id) {
    shape.organization_name = string().required();
    shape.organization_id = number().required();
  }
  const schema = object().shape(shape);

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.container}>
        {isError ? (
          <Card status="danger" style={styles.errorCard}>
            <Text>{t('screens.profile.errorLoadingProfile')}</Text>
            <Text>{error?.message}</Text>
          </Card>
        ) : null}
        {data ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={{ padding: PADDING }}>
              <Input
                label={t('screens.profile.name')}
                value={`${data.first_name} ${data.last_name}`}
                disabled
                style={styles.padded}
              />
              <Input
                label={t('screens.profile.email')}
                value={`${data.email}`}
                disabled
                style={styles.padded}
              />
              <Formik
                innerRef={formikRef}
                initialValues={{
                  phone: data.phone,
                  organization_id: data.organization_id,
                  organization_name: data.organization_name,
                  organization_type: userType,
                }}
                onSubmit={(values) => {
                  updateMutation.mutate(values);
                }}
                validationSchema={schema}
              >
                {({
                  values,
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  dirty,
                  errors,
                  isValid,
                  setValues,
                  touched,
                }) => (
                  <>
                    <MyPhoneInput
                      accessibilityRole="text"
                      accessibilityLabel={t('phone')}
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      label={t('phone')}
                      value={values.phone}
                      style={styles.padded}
                      onChange={handleChange('phone')}
                      onBlur={handleBlur('phone')}
                      status={errors.phone ? 'danger' : null}
                    />
                    {data.organization_id !== null ? (
                      <>
                        <Text
                          category="label"
                          appearance="hint"
                          style={styles.label}
                        >
                          {t('organization')}
                        </Text>
                        <SearchList
                          value={{
                            id: values.organization_id,
                            name:
                              values.organization_id ===
                              commonConfig.otherOrg.id
                                ? commonConfig.otherOrg.name
                                : values.organization_name,
                          }}
                          onChange={(item) => {
                            const newValues = {
                              ...values,
                              organization_id: item?.id,
                              organization_name:
                                item?.id === commonConfig.otherOrg.id
                                  ? null
                                  : item?.name,
                            };
                            setValues(newValues);
                          }}
                          items={organizationsLookup}
                          placeholder={t('organization')}
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
                            label={t('screens.profile.addOrganization')}
                            caption={
                              errors.organization_name &&
                              touched.organization_name
                                ? errors.organization_name
                                : null
                            }
                            textContentType="organizationName"
                            value={
                              values.organization_name !==
                              commonConfig.otherOrg.name
                                ? values.organization_name
                                : ''
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
                      disabled={!dirty || !isValid || updateMutation.isPending}
                      status="info"
                    >
                      {t('update')}
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

              <Text category="h5">{t('screens.profile.otherInformation')}</Text>
            </View>
            <Divider />
            <ValueContainer
              label={t('screens.profile.approved')}
              value={booleanToYesNo(data.approved)}
            />
            <ValueContainer
              label={t('screens.profile.registeredDate')}
              value={dateToString(data.registered_date)}
            />
            <ValueContainer label="Role" value={data.role} />
            <ValueContainer
              label={t('screens.profile.authProvider')}
              value={data.auth_provider}
            />
            <ValueContainer
              label={t('screens.profile.reportsSubmitted')}
              value={data.reports_submitted}
            />

            <View style={styles.deleteButtonContainer}>
              <Text category="h5" style={{ marginBottom: PADDING }}>
                {t('screens.profile.dangerZone')}
              </Text>
              <Button
                style={styles.button}
                onPress={handleDeleteAccountButton}
                status="danger"
                disabled={deleteAccountMutation.isPending}
              >
                {t('screens.profile.deleteAccount')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </ScrollView>
      <Spinner show={isPending} message={t('screens.profile.loadingProfile')} />
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
  deleteButtonContainer: {
    padding: PADDING,
    paddingTop: PADDING * 2,
  },
});
