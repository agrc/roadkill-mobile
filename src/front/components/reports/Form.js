import { Button, Input, Text } from '@ui-kitten/components';
import { Formik } from 'formik';
import propTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import config from '../../services/config';
import t from '../../services/localization';
import { PADDING } from '../../services/styles';
import PhotoCapture from './PhotoCapture';
import RadioPills from './RadioPills';
import Species from './Species';

const ageOptions = [
  {
    label: t('components.reports.form.adult'),
    value: 'adult',
  },
  {
    label: t('components.reports.form.juvenile'),
    value: 'juvenile',
  },
  {
    label: t('unknown').toLowerCase(),
    value: config.UNKNOWN,
  },
];
const genderOptions = [
  {
    label: t('components.reports.form.female'),
    value: 'female',
  },
  {
    label: t('components.reports.form.male'),
    value: 'male',
  },
  {
    label: t('unknown').toLowerCase(),
    value: config.UNKNOWN,
  },
];

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
  const onAgeChange = useCallback(
    (newValue) => {
      formikRef.current.setFieldValue('age_class', newValue);
    },
    [formikRef],
  );
  const onGenderChange = useCallback(
    (newValue) => {
      formikRef.current.setFieldValue('sex', newValue);
    },
    [formikRef],
  );
  const [ableToIdentify, setAbleToIdentify] = useState(true);
  useEffect(() => {
    if (!ableToIdentify) {
      formikRef.current.setFieldValue('age_class', config.UNKNOWN);
      formikRef.current.setFieldValue('sex', config.UNKNOWN);
    } else {
      formikRef.current.setFieldValue('age_class', null);
      formikRef.current.setFieldValue('sex', null);
    }
  }, [ableToIdentify, formikRef]);
  const [resetSpecies, setResetSpecies] = useState(false);
  const [photoIsProcessing, setPhotoIsProcessing] = useState(false);

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
            setValues={setValues}
            setResetSpecies={setResetSpecies}
            reset={resetSpecies}
            style={styles.bottomBump}
            ableToIdentify={ableToIdentify}
            setAbleToIdentify={setAbleToIdentify}
          />
          {ableToIdentify ? (
            <>
              <Text category="h6">{t('components.reports.form.age')}</Text>
              <RadioPills
                value={values.age_class}
                onChange={onAgeChange}
                options={ageOptions}
                style={styles.bottomBump}
              />
              <Text category="h6">{t('components.reports.form.sex')}</Text>
              <RadioPills
                value={values.sex}
                onChange={onGenderChange}
                options={genderOptions}
                style={styles.bottomBump}
              />
            </>
          ) : null}
          {children({ values, setFieldValue, errors })}
          <PhotoCapture
            onChange={onPhotoChange}
            uri={values.photo?.uri}
            style={styles.bottomBump}
            setPhotoIsProcessing={setPhotoIsProcessing}
          />
          <Text category="h6">
            {t('components.reports.form.additionalComments')}:
          </Text>
          <Input
            multiline
            textStyle={{ minHeight: 64 }}
            value={values.comments}
            onChangeText={handleChange('comments')}
          />
          <View style={styles.buttonContainer}>
            <Button
              appearance="ghost"
              // onPress passes a default argument so we need to wrap it in
              // an anonymous function to make sure that force is false in onClose
              onPress={() => onClose()}
              style={styles.button}
            >
              {t('cancel')}
            </Button>
            <Button
              status="info"
              onPress={handleSubmit}
              disabled={
                !dirty || !isValid || mutation.isPending || photoIsProcessing
              }
              style={styles.button}
            >
              {t('components.reports.form.submitReport')}
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
