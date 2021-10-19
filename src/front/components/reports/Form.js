import { Button, Divider, Input, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import ky from 'ky';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import * as Sentry from 'sentry-expo';
import useAuth from '../../auth/context';
import config from '../../config';
import { ACCURACY, getLocation } from '../../location';
import useStyles, { PADDING } from '../../styles';
import { coordinatesToString } from '../../utilities';
import PhotoCapture from './PhotoCapture';
import RadioPills from './RadioPills';
import Species from './Species';

const GENDERS = ['female', 'male'];
const AGES = ['adult', 'juvenile'];

export default function Form({
  formikRef,
  initialValues,
  validationSchema,
  carcassCoordinates,
  reportType,
  onClose,
  children = () => null,
  isLoading,
  setIsLoading,
  style,
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
        let newValue = values[valueName];
        if (values[valueName] instanceof Date) {
          newValue = newValue.toISOString();
        }
        formData.append(valueName, newValue);
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
          timeout: 20000, // give cloud run time to spin up especially in dev project
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

  const onPhotoChange = (newPhotoProps) => {
    if (!newPhotoProps) {
      formikRef.current.setFieldValue('photo', null);
      formikRef.current.setFieldValue('photo_location', null);
      formikRef.current.setFieldValue('photo_date', null);
    } else {
      const { uri, type, name, coordinates, date } = newPhotoProps;
      formikRef.current.setFieldValue('photo', {
        uri,
        type,
        name,
      });
      formikRef.current.setFieldValue('photo_location', coordinates);
      formikRef.current.setFieldValue('photo_date', date);
    }
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => submitReport(values).then(() => setIsLoading(false))}
      style={style}
    >
      {({ values, setFieldValue, errors, dirty, isValid, handleSubmit }) => (
        <>
          {children({ values, setFieldValue, errors })}
          <PhotoCapture
            isRequired={validationSchema.fields.photo.spec.presence === 'required'}
            onChange={onPhotoChange}
            uri={values.photo?.uri}
          />
          <Species
            onChange={(newValue) => {
              setFieldValue('species', newValue.species);
              setFieldValue('species_confidence_level', newValue.species_confidence_level);
            }}
            values={{
              species: values.species,
              species_confidence_level: values.species_confidence_level,
            }}
            style={styles.bottomBump}
          />
          <Text category="h6">Animal age?</Text>
          <RadioPills
            value={values.age_class}
            onChange={(value) => setFieldValue('age_class', value)}
            options={AGES.concat([config.UNKNOWN])}
            style={styles.bottomBump}
          />
          <Text category="h6">Animal sex?</Text>
          <RadioPills
            value={values.sex}
            onChange={(value) => setFieldValue('sex', value)}
            options={GENDERS.concat([config.UNKNOWN])}
            style={styles.bottomBump}
          />
          <Text category="h6">Additional comments:</Text>
          <Input
            multiline
            textStyle={{ minHeight: 64 }}
            value={values.comments}
            onChangeText={(value) => setFieldValue('comments', value)}
          />
          <Divider style={commonStyles.margin} />
          <Button
            status="info"
            style={commonStyles.margin}
            onPress={handleSubmit}
            disabled={!dirty || !isValid || isLoading}
          >
            Submit Report
          </Button>
          {/* {__DEV__ ? ( */}
          <>
            <Text category="c1">
              [The below text is only for debugging the values sent to the database. It will not show up in production.]
            </Text>
            <Text>errors: {JSON.stringify(errors, null, '  ')}</Text>
            <Text>values: {JSON.stringify(values, null, '  ')}</Text>
          </>
          {/* ) : null} */}
        </>
      )}
    </Formik>
  );
}

Form.propTypes = {
  formikRef: propTypes.object.isRequired,
  initialValues: propTypes.object.isRequired,
  validationSchema: propTypes.object.isRequired,
  children: propTypes.func,
  carcassCoordinates: propTypes.object,
  reportType: propTypes.string.isRequired,
  onClose: propTypes.func.isRequired,
  isLoading: propTypes.bool.isRequired,
  setIsLoading: propTypes.func.isRequired,
  style: propTypes.object,
};

const styles = StyleSheet.create({
  bottomBump: {
    marginBottom: PADDING,
  },
});
