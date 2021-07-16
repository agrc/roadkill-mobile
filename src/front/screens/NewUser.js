import { useNavigation } from '@react-navigation/native';
import { Button, Input, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as yup from 'yup';
import 'yup-phone';
import useAuth from '../auth/context';
import config from '../config';
import RootView from '../RootView';

export default function NewUserScreen() {
  const { logOut, userType } = useAuth();
  const navigation = useNavigation();
  const organizationIsRequired = userType !== config.USER_TYPES.public;

  const shape = {
    phone: yup.string().phone('US').required('phone is required'),
  };
  if (organizationIsRequired) {
    shape.organization = yup.string().required('organization is required');
  }
  const schema = yup.object().shape(shape);

  const register = (values, { setSubmitting }) => {
    console.log('values', values);
    setSubmitting(false);
  };
  const cancel = () => {
    navigation.navigate('login');
    logOut();
  };

  const { authInfo } = useAuth();
  return (
    <RootView>
      <ScrollView style={styles.layout}>
        <Text category="h1">Please complete your profile</Text>

        <Formik initialValues={{ phone: null, organization: null }} validationSchema={schema} onSubmit={register}>
          {({ values, handleChange, handleBlur, handleSubmit, errors, isValid, touched }) => (
            <>
              <View style={styles.inputsContainer}>
                <Input style={styles.input} label="Name" value={authInfo?.user.name} disabled />
                <Input style={styles.input} label="Email" value={authInfo?.user.email} disabled />
                {organizationIsRequired ? (
                  <Input
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
                <Input
                  style={styles.input}
                  label="Phone"
                  caption={errors.phone && touched.phone ? errors.phone : null}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  value={values.phone}
                  onChangeText={handleChange('phone')}
                  onBlur={handleBlur('phone')}
                  status={errors.phone ? 'danger' : null}
                />
              </View>
              <Button onPress={handleSubmit} style={styles.input} disabled={!isValid}>
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
