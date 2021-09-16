import { Button, Card, Divider, Text, useTheme } from '@ui-kitten/components';
import { Formik } from 'formik';
import ky from 'ky';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useMutation } from 'react-query';
import * as Sentry from 'sentry-expo';
import * as yup from 'yup';
import useAuth from '../auth/context';
import Location from '../components/reports/Location';
import PhotoCapture from '../components/reports/PhotoCapture';
import RepeatSubmission from '../components/reports/RepeatSubmission';
import config from '../config';
import { getIcon } from '../icons';
import useStyles from '../styles';

const SET_LOCATION_VIEW = 'set_location_view';
const MAIN_VIEW = 'main_view';
const COMMON_ANIMATION_PROPS = {
  useNativeDriver: false,
  duration: 250,
};
export const REPORT_TYPES = {
  report: 'report',
  pickup: 'pickup',
};

const Report = ({ reportType, hideReport, setHeight, setMarker, carcassCoordinates }) => {
  const animatedMaxHeight = React.useRef(new Animated.Value(0));
  const windowDimensions = useWindowDimensions();
  const theme = useTheme();
  const locationViewHeight = React.useRef(null);
  const [view, setView] = React.useState(SET_LOCATION_VIEW);
  const [showMain, setShowMain] = React.useState(false);
  const {
    // eslint-disable-next-line no-unused-vars
    authInfo: { user },
    getBearerToken,
  } = useAuth();
  const commonStyles = useStyles();

  const Header = (props) => (
    <View {...props} style={[props.style, styles.header, { paddingTop: showMain ? 50 : null }]}>
      <Text category="h5">{reportType == REPORT_TYPES.report ? 'Report a Carcass' : 'Pickup a Carcass'}</Text>
      <Button
        accessoryLeft={getIcon({
          pack: 'material-community',
          name: 'close-circle-outline',
          size: 30,
          color: theme['color-basic-800'],
        })}
        size="tiny"
        appearance="ghost"
        onPress={onClose}
        style={styles.closeButton}
      />
    </View>
  );
  Header.propTypes = {
    style: propTypes.array,
  };

  React.useEffect(() => {
    if (reportType) {
      Animated.timing(animatedMaxHeight.current, {
        // is there a better way to get the height of the animated view?
        // I'm hoping that 50% of window height is good for the smaller devices...
        toValue: windowDimensions.height * 0.5,
        ...COMMON_ANIMATION_PROPS,
      }).start(() => {
        setHeight(locationViewHeight.current);
      });
    } else {
      Animated.timing(animatedMaxHeight.current, {
        toValue: 0,
        ...COMMON_ANIMATION_PROPS,
      }).start();
    }
  }, [reportType]);

  React.useEffect(() => {
    const newMaxHeight = view === MAIN_VIEW ? windowDimensions.height : windowDimensions.height * 0.5;

    if (reportType) {
      if (view === MAIN_VIEW) {
        setShowMain(true);
      }

      Animated.timing(animatedMaxHeight.current, {
        toValue: newMaxHeight,
        ...COMMON_ANIMATION_PROPS,
      }).start(() => {
        if (view === SET_LOCATION_VIEW) {
          setShowMain(false);
        }
      });
    }
  }, [view]);

  const isDirty = () => {
    return carcassCoordinates !== null && formikRef.current.dirty;
  };

  const onClose = async () => {
    const close = () => {
      hideReport();
      setView(SET_LOCATION_VIEW);
      setShowMain(false);
      formikRef.current?.resetForm();
    };

    if (isDirty()) {
      Alert.alert('Are you sure?', 'All in-progress report data will be lost.', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close',
          onPress: () => close(),
        },
      ]);
    } else {
      close();
    }
  };

  const onSetLocation = () => {
    setMarker();

    setTimeout(() => setView(MAIN_VIEW), 600);
  };

  const onEditLocation = () => {
    setView(SET_LOCATION_VIEW);
  };

  // set up form
  const formikRef = React.useRef(null);
  const initialFormValues = {
    repeat_submission: false,
    photo: null,
  };
  const photoShape = {
    uri: yup.string().required(),
    type: yup.string().required(),
    name: yup.string().required(),
    coordinates: yup.array().of(yup.number()).nullable(),
    date: yup.date().required(),
  };
  const shape = {
    photo: yup.object().shape(photoShape).required().typeError('a photo is required'),
  };
  if (reportType === REPORT_TYPES.report) {
    shape.repeat_submission = yup.boolean().required();
    shape.photo = yup.object().shape(photoShape).nullable();
  }
  const validationSchema = yup.object().shape(shape);
  const submitReport = async (values) => {
    const token = await getBearerToken();
    let responseJson;
    try {
      responseJson = await ky
        .post(`${config.API}/reports/new`, {
          json: {
            ...values,
            animal_location: carcassCoordinates, // TODO: are these in the correct format?
          },
          headers: {
            Authorization: token,
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
      Alert.alert('Success', 'Your report has been submitted.', [
        {
          text: 'OK',
          onPress: () => {
            formikRef.current.resetForm();
            hideReport();
          },
        },
      ]);
    } else {
      Alert.alert('Error', responseJson.error);
    }
  };
  const submitReportMutation = useMutation('submit-report', submitReport);
  const onPhotoChange = (newValue) => {
    formikRef.current.setFieldValue('photo', newValue);
  };

  return (
    <Animated.View
      // The reason why I'm doing maxHeight rather than height is because we can't find the
      // height of the animated view until it's displayed. A fixed height would not be flexible
      // enough for different screen sizes.
      style={[styles.container, { maxHeight: animatedMaxHeight.current }]}
      onLayout={(event) => (locationViewHeight.current = event.nativeEvent.layout.height)}
    >
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={validationSchema}
        onSubmit={submitReportMutation.mutate}
        isSubmitting={submitReportMutation.isLoading}
      >
        {({ values, handleSubmit, isValid, setFieldValue, errors, dirty }) => (
          <Card style={styles.card} header={Header} disabled>
            <Location onSetLocation={onSetLocation} onEditLocation={onEditLocation} showEdit={!showMain} />
            {showMain ? (
              <View style={{ height: windowDimensions.height }}>
                {reportType === REPORT_TYPES.report ? (
                  // report form
                  <>
                    <RepeatSubmission
                      checked={values.repeat_submission}
                      onChange={(newValue) => setFieldValue('repeat_submission', newValue)}
                      cancelReport={onClose}
                    />
                    <PhotoCapture
                      isRequired={shape.photo.spec.presence === 'required'}
                      onChange={onPhotoChange}
                      value={values.photo}
                    />
                  </>
                ) : (
                  // pickup form
                  <>
                    <PhotoCapture
                      isRequired={shape.photo.spec.presence === 'required'}
                      onChange={onPhotoChange}
                      value={values.photo}
                    />
                  </>
                )}
                <Divider style={commonStyles.margin} />
                <Button
                  status="info"
                  style={commonStyles.margin}
                  onPress={handleSubmit}
                  disabled={!dirty || !isValid || submitReportMutation.isLoading}
                >
                  Submit Report
                </Button>
                <Text>[The submit button is not working yet...]</Text>
                {__DEV__ ? (
                  <>
                    <Text>values: {JSON.stringify(values, null, '  ')}</Text>
                    <Text>errors: {JSON.stringify(errors, null, '  ')}</Text>
                  </>
                ) : null}
              </View>
            ) : null}
          </Card>
        )}
      </Formik>
    </Animated.View>
  );
};

Report.propTypes = {
  reportType: propTypes.oneOf([REPORT_TYPES.report, REPORT_TYPES.pickup, null]),
  hideReport: propTypes.func,
  setHeight: propTypes.func,
  setMarker: propTypes.func,
  carcassCoordinates: propTypes.object,
};

const RADIUS = 15;
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  card: {
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: { marginRight: -10 },
});

export default Report;
