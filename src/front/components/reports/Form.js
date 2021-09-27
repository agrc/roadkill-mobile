import { Button, Divider, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import ky from 'ky';
import propTypes from 'prop-types';
import React from 'react';
import { Alert } from 'react-native';
import * as Sentry from 'sentry-expo';
import useAuth from '../../auth/context';
import config from '../../config';
import { ACCURACY, getLocation } from '../../location';
import useStyles from '../../styles';
import { coordinatesToString } from '../../utilities';

export default function Form({
  formikRef,
  initialValues,
  validationSchema,
  carcassCoordinates,
  reportType,
  onClose,
  children,
  isLoading,
  setIsLoading,
}) {
  const {
    authInfo: { user },
    getBearerToken,
  } = useAuth();
  const commonStyles = useStyles();

  const submitReport = async (values) => {
    console.log('submitReport');

    setIsLoading(true);

    const formData = new FormData();
    for (let valueName in values) {
      if (values[valueName] !== null) {
        formData.append(valueName, values[valueName]);
      }
    }

    // add data gathered from outside of the form
    formData.append('animal_location', coordinatesToString(carcassCoordinates));
    formData.append('user_id', user.id);
    formData.append('submit_date', new Date().toISOString());
    const currentLocation = await getLocation(ACCURACY.Highest);
    formData.append('submit_location', coordinatesToString(currentLocation.coords));

    console.log('formData', formData);

    let responseJson;
    try {
      responseJson = await ky
        .post(`${config.API}/reports/${reportType}`, {
          body: formData,
          headers: {
            Authorization: await getBearerToken(),
          },
        })
        .json();
    } catch (error) {
      Sentry.Native.captureException(error);
      Alert.alert('Error', error.message);
      // TODO: allow them to cache the report for submission at a later time.

      return;
    }

    if (responseJson.success) {
      console.log('responseJson.report_id', responseJson.report_id);

      Alert.alert('Success!', 'Your report has been submitted.', [
        {
          text: 'OK',
          onPress: () => onClose(true),
        },
      ]);
    } else {
      Alert.alert('Error', responseJson.error);
    }
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => submitReport(values).then(() => setIsLoading(false))}
    >
      {({ values, setFieldValue, errors, dirty, isValid, handleSubmit }) => (
        <>
          {children({ values, setFieldValue, errors })}
          <Divider style={commonStyles.margin} />
          <Button
            status="info"
            style={commonStyles.margin}
            onPress={handleSubmit}
            disabled={!dirty || !isValid || isLoading}
          >
            Submit Report
          </Button>
          {__DEV__ ? (
            <>
              <Text>errors: {JSON.stringify(errors, null, '  ')}</Text>
              <Text>values: {JSON.stringify(values, null, '  ')}</Text>
            </>
          ) : null}
        </>
      )}
    </Formik>
  );
}
Form.propTypes = {
  formikRef: propTypes.object.isRequired,
  initialValues: propTypes.object.isRequired,
  validationSchema: propTypes.object.isRequired,
  children: propTypes.func.isRequired,
  carcassCoordinates: propTypes.object,
  reportType: propTypes.string.isRequired,
  onClose: propTypes.func.isRequired,
  isLoading: propTypes.bool.isRequired,
  setIsLoading: propTypes.func.isRequired,
};
