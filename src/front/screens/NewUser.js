import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, Input, Text } from '@ui-kitten/components';
import commonConfig from 'common/config';
import { Formik } from 'formik';
import React from 'react';
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
import RootView from '../components/RootView';
import SearchList from '../components/reports/SearchList';
import config from '../services/config';
import { getConstants } from '../services/constants';
import t from '../services/localization';
import { PADDING } from '../services/styles';

// TODO: A lot of this code could be shared with Profile.js
export default function NewUserScreen() {
  const { logOut, userType, authInfo, registerUser } = useAuth();
  const navigation = useNavigation();
  const organizationIsRequired = userType !== config.USER_TYPES.public;
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      if (userType !== config.USER_TYPES.public) {
        Alert.alert(t('success'), t('screens.newUser.registrationSuccess'));
      }
    },
    onError: (error) => {
      Sentry.Native.captureException(error);

      Alert.alert(t('error'), t('screens.newUser.registrationError'));
    },
  });
  const [organizationsLookup, setOrganizationsLookup] = React.useState([]);

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

  const shape = {
    phone: string().phone('US').required(),
  };

  // add org, if required
  if (organizationIsRequired) {
    shape.organization_name = string().required();
    shape.organization_id = number().required();
  }

  // add name/email, if not provided by oauth
  if (!authInfo?.oauthUser.given_name || !authInfo?.oauthUser.family_name) {
    shape.name = string().required();
  }
  const schema = object().shape(shape);

  const register = async ({
    phone,
    organization_id,
    organization_name,
    name,
    email,
  }) => {
    await registerMutation.mutate({
      user: {
        phone,
        first_name: authInfo.oauthUser.given_name || name.split(' ')[0],
        last_name:
          authInfo.oauthUser.family_name ||
          name.split(' ')[1] ||
          '<none provided>',
        email: authInfo.oauthUser.email || email,
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

  const name = authInfo?.oauthUser.given_name
    ? `${authInfo?.oauthUser.given_name || ''} ${
        authInfo?.oauthUser.family_name || ''
      }`
    : '';

  return (
    <RootView showSpinner={registerMutation.isPending}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.layout}>
          <Text category="h1">{t('screens.newUser.completeProfile')}</Text>

          <Card status="danger" style={{ marginTop: PADDING * 2 }}>
            <Text category="h6">{t('screens.newUser.pleaseNote')}</Text>
            <Text>{t('screens.newUser.distractedDrivingNote')}</Text>
          </Card>

          <Text style={{ marginTop: PADDING }}>
            {t('screens.newUser.pleaseFillOut')}
          </Text>

          <Formik
            initialValues={{
              phone: null,
              organization_id: null,
              organization_name: null,
              name,
              email: authInfo?.oauthUser.email ?? '',
            }}
            validationSchema={schema}
            onSubmit={register}
            isSubmitting={registerMutation.isPending}
          >
            {({
              values,
              handleChange,
              handleBlur,
              handleSubmit,
              errors,
              isValid,
              touched,
              dirty,
              setValues,
            }) => (
              <>
                <View style={styles.inputsContainer}>
                  <Input
                    style={styles.input}
                    label={t('name')}
                    value={values.name}
                    onChangeText={handleChange('name')}
                    disabled={
                      authInfo?.oauthUser.given_name ||
                      authInfo?.oauthUser.family_name
                    }
                  />
                  <Input
                    style={styles.input}
                    label={t('email')}
                    value={values.email}
                    disabled={authInfo?.oauthUser.email}
                    onChangeText={handleChange('email')}
                  />
                  {organizationIsRequired ? (
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
                            values.organization_id === commonConfig.otherOrg.id
                              ? commonConfig.otherOrg.name
                              : values.organization_name,
                        }}
                        onChange={(item) => {
                          setValues({
                            ...values,
                            organization_id: item?.id,
                            organization_name:
                              item?.id === commonConfig.otherOrg.id
                                ? null
                                : item?.name,
                          });
                        }}
                        items={organizationsLookup}
                        placeholder={t('organization')}
                        itemToString={(item) => item?.name}
                        itemToKey={(item) => item?.id}
                        displayPhotos={false}
                        forceModal={true}
                      />
                      {values.organization_id === commonConfig.otherOrg.id ? (
                        <Input
                          accessibilityRole="text"
                          style={styles.input}
                          label={t('screens.newUser.addNewOrg')}
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
                  <MyPhoneInput
                    accessibilityRole="text"
                    style={styles.input}
                    label={t('phone')}
                    accessibilityLabel={t('phone')}
                    caption={
                      errors.phone && touched.phone ? errors.phone : null
                    }
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
                  disabled={!dirty || !isValid || registerMutation.isPending}
                  status="info"
                >
                  {t('screens.newUser.register')}
                </Button>
                <Button
                  onPress={cancel}
                  style={styles.input}
                  appearance="ghost"
                >
                  {t('cancel')}
                </Button>
                {/* {__DEV__ ? (
                <>
                  <Text category="c1">
                    [The below text is only for debugging the values sent to the
                    database. It will not show up in production.]
                  </Text>
                  <Text>errors: {JSON.stringify(errors, null, '  ')}</Text>
                  <Text>values: {JSON.stringify(values, null, '  ')}</Text>
                  <Text>touched: {JSON.stringify(touched, null, '  ')}</Text>
                </>
              ) : null} */}
              </>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </RootView>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, padding: 25 },
  inputsContainer: { marginBottom: 25 },
  input: { marginVertical: PADDING / 2 },
  label: { marginBottom: PADDING / 2 },
});
