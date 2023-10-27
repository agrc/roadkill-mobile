import { Button, Input, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import config from '../../services/config';
import { PADDING } from '../../services/styles';
import PhotoCapture from './PhotoCapture';
import RadioPills from './RadioPills';
import Species from './Species';

const GENDERS = ['female', 'male'];
const AGES = ['adult', 'juvenile'];

export default function Form({
  formikRef,
  initialValues,
  validationSchema,
  children = () => null,
  mutation,
  style,
  onClose,
}) {
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
  const [ableToIdentify, setAbleToIdentify] = React.useState(true);
  React.useEffect(() => {
    if (!ableToIdentify) {
      formikRef.current.setFieldValue('age_class', config.UNKNOWN);
      formikRef.current.setFieldValue('sex', config.UNKNOWN);
    } else {
      formikRef.current.setFieldValue('age_class', null);
      formikRef.current.setFieldValue('sex', null);
    }
  }, [ableToIdentify, formikRef]);
  const [resetSpecies, setResetSpecies] = React.useState(false);

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => mutation.mutate(values)}
      onReset={() => {
        setAbleToIdentify(true);
        setResetSpecies(true);
      }}
      style={style}
    >
      {({
        values,
        setFieldValue,
        errors,
        dirty,
        isValid,
        handleSubmit,
        handleChange,
        setValues,
      }) => (
        <>
          <Species
            onChange={(speciesValues) => {
              setValues({
                ...values,
                ...speciesValues,
              });
              setResetSpecies(false);
            }}
            reset={resetSpecies}
            style={styles.bottomBump}
            ableToIdentify={ableToIdentify}
            setAbleToIdentify={setAbleToIdentify}
          />
          {ableToIdentify ? (
            <>
              <Text category="h6">Animal age?</Text>
              <RadioPills
                value={values.age_class}
                onChange={handleChange('age_class')}
                options={AGES.concat([config.UNKNOWN])}
                style={styles.bottomBump}
              />
              <Text category="h6">Animal sex?</Text>
              <RadioPills
                value={values.sex}
                onChange={handleChange('sex')}
                options={GENDERS.concat([config.UNKNOWN])}
                style={styles.bottomBump}
              />
            </>
          ) : null}
          {children({ values, setFieldValue, errors })}
          <PhotoCapture
            onChange={onPhotoChange}
            uri={values.photo?.uri}
            style={styles.bottomBump}
          />
          <Text category="h6">Additional comments:</Text>
          <Input
            multiline
            textStyle={{ minHeight: 64 }}
            value={values.comments}
            onChangeText={handleChange('comments')}
          />
          <View style={styles.buttonContainer}>
            <Button
              appearance="ghost"
              onPress={() => onClose()}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              status="info"
              onPress={handleSubmit}
              disabled={!dirty || !isValid || mutation.isPending}
              style={styles.button}
            >
              Submit Report
            </Button>
          </View>
          {__DEV__ ? (
            <>
              <Text category="c1">
                [The below text is only for debugging the values sent to the
                database. It will not show up in production.]
              </Text>
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
  buttonContainer: {
    marginTop: PADDING * 2,
    width: '100%',
    flexDirection: 'row',
    marginBottom: PADDING * 2,
  },
  button: {
    flex: 1,
  },
});
