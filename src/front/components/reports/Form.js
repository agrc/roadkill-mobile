import { Button, Divider, Input, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet } from 'react-native';
import config from '../../config';
import useStyles, { PADDING } from '../../styles';
import PhotoCapture from './PhotoCapture';
import RadioPills from './RadioPills';
import Species from './Species';

const GENDERS = ['female', 'male'];
const AGES = ['adult', 'juvenile'];

export default function Form({ formikRef, initialValues, validationSchema, children = () => null, mutation, style }) {
  const commonStyles = useStyles();

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
      onSubmit={(values) => mutation.mutate(values)}
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
            disabled={!dirty || !isValid || mutation.isLoading}
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
  children: propTypes.func,
  formikRef: propTypes.object.isRequired,
  initialValues: propTypes.object.isRequired,
  mutation: propTypes.object.isRequired,
  onClose: propTypes.func.isRequired,
  reportType: propTypes.string.isRequired,
  style: propTypes.object,
  validationSchema: propTypes.object.isRequired,
};

const styles = StyleSheet.create({
  bottomBump: {
    marginBottom: PADDING,
  },
});
