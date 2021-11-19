import { Button, Datepicker, Divider, NativeDateService, Text, useTheme } from '@ui-kitten/components';
import * as reportSchemas from 'common/validation/reports';
import ky from 'ky';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Animated, Keyboard, StyleSheet, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useMutation, useQueryClient } from 'react-query';
import * as Sentry from 'sentry-expo';
import * as yup from 'yup';
import useAuth from '../auth/context';
import Form from '../components/reports/Form';
import Location from '../components/reports/Location';
import RepeatSubmission from '../components/reports/RepeatSubmission';
import Spinner from '../components/Spinner';
import config from '../config';
import { getIcon } from '../icons';
import { ACCURACY, getLocation } from '../location';
import { PADDING } from '../styles';
import { coordinatesToString } from '../utilities';

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
const commonInitialValues = {
  photo: null,
  photo_location: null,
  photo_date: null,
  species: null,
  species_confidence_level: null,
  age_class: null,
  sex: null,
  comments: null,
};
const initialFormValues = {
  // skip values that are gathered outside of the form
  report: {
    ...commonInitialValues,
    repeat_submission: false,
    discovery_date: null,
  },
  pickup: {
    ...commonInitialValues,
    pickup_date: null,
  },
};
const formShapes = {
  report: {},
  pickup: {},
};
// pick only the props that the form manages
for (let key in initialFormValues.report) {
  formShapes.report[key] = yup.reach(reportSchemas.report, key);
}
for (let key in initialFormValues.pickup) {
  formShapes.pickup[key] = yup.reach(reportSchemas.pickup, key);
}
const formSchemas = {
  report: yup.object().shape(formShapes.report),
  pickup: yup.object().shape(formShapes.pickup),
};
const localDateService = new NativeDateService('en', { format: 'MM/DD/YYYY' });

const Report = ({ show, reportType, hideReport, setHeight, setMarker, carcassCoordinates }) => {
  const animatedMaxHeight = React.useRef(new Animated.Value(0));
  const windowDimensions = useWindowDimensions();
  const theme = useTheme();
  const locationViewHeight = React.useRef(null);
  const [view, setView] = React.useState(SET_LOCATION_VIEW);
  const [showMain, setShowMain] = React.useState(false);

  const {
    authInfo: { user },
    getBearerToken,
  } = useAuth();

  const submitReport = async (values) => {
    console.log('submitReport');

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
      throw error;
      // TODO: allow them to cache the report for submission at a later time.
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
      throw new Error(responseJson.error);
    }
  };

  const queryClient = useQueryClient();
  const mutation = useMutation(submitReport, {
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.reports);
      queryClient.invalidateQueries(config.QUERY_KEYS.profile);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  React.useEffect(() => {
    if (show) {
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
  }, [show]);

  React.useEffect(() => {
    const newMaxHeight = view === MAIN_VIEW ? windowDimensions.height : windowDimensions.height * 0.5;

    if (show) {
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
    return carcassCoordinates !== null || formikRef.current?.dirty;
  };

  const onClose = async (force = false) => {
    const close = () => {
      Keyboard.dismiss();
      hideReport();
      setView(SET_LOCATION_VIEW);
      setShowMain(false);
      formikRef.current?.resetForm();
    };

    if (!force && isDirty()) {
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

  // set up form
  const reportFormikRef = React.useRef(null);
  const pickupFormikRef = React.useRef(null);
  const formikRef = reportType === REPORT_TYPES.report ? reportFormikRef : pickupFormikRef;

  React.useEffect(() => {
    if (show) {
      // reset the default date values on form open
      initialFormValues.report.discovery_date = new Date();
      initialFormValues.pickup.pickup_date = new Date();
    }
  }, [show]);

  const containerStyle = {
    ...styles.container,
    maxHeight: animatedMaxHeight.current,
    backgroundColor: theme['color-basic-100'],
    borderColor: theme['color-basic-400'],
  };
  if (showMain) {
    containerStyle.height = windowDimensions.height;
  } else {
    containerStyle.borderTopLeftRadius = RADIUS;
    containerStyle.borderTopRightRadius = RADIUS;
  }

  return (
    <Animated.View
      // The reason why I'm doing maxHeight rather than height is because we can't find the
      // height of the animated view until it's displayed. A fixed height would not be flexible
      // enough for different screen sizes.
      style={containerStyle}
      onLayout={(event) => (locationViewHeight.current = event.nativeEvent.layout.height)}
    >
      <View style={[styles.header, { paddingTop: showMain ? 50 : null }]}>
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
          onPress={() => onClose()}
          style={styles.closeButton}
        />
      </View>
      <Divider />
      <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={PADDING + 5} scrollEnabled={showMain}>
        <View style={styles.body}>
          {!showMain ? <Location onSetLocation={onSetLocation} /> : null}

          {
            // the Form components are wrapped in a view and hidden via styling
            // to prevent them from being remounted when they are hidden
          }
          <View style={showMain ? null : styles.hidden}>
            {reportType === REPORT_TYPES.report ? (
              // report form
              <Form
                formikRef={reportFormikRef}
                initialValues={initialFormValues.report}
                key="report-form"
                mutation={mutation}
                onClose={onClose}
                reportType={reportType}
                validationSchema={formSchemas.report}
              >
                {({ values, setFieldValue }) => (
                  <>
                    <RepeatSubmission
                      checked={values.repeat_submission}
                      onChange={(newValue) => setFieldValue('repeat_submission', newValue)}
                      cancelReport={() => onClose()}
                    />
                    <Text category="h6">When was the animal discovered?</Text>
                    <Datepicker
                      accessoryRight={getIcon({
                        pack: 'font-awesome-5',
                        name: 'calendar-alt',
                      })}
                      date={values.discovery_date}
                      dateService={localDateService}
                      max={new Date()}
                      onSelect={(newValue) => setFieldValue('discovery_date', newValue)}
                      style={styles.bumpBottom}
                    />
                  </>
                )}
              </Form>
            ) : (
              // pickup form
              <Form
                formikRef={pickupFormikRef}
                initialValues={initialFormValues.pickup}
                key="pickup-form"
                mutation={mutation}
                onClose={onClose}
                reportType={reportType}
                validationSchema={formSchemas.pickup}
              >
                {({ values, setFieldValue }) => (
                  <>
                    <Text category="h6">When was the animal picked up?</Text>
                    <Datepicker
                      accessoryRight={getIcon({
                        pack: 'font-awesome-5',
                        name: 'calendar-alt',
                      })}
                      date={values.pickup_date}
                      dateService={localDateService}
                      max={new Date()}
                      onSelect={(newValue) => setFieldValue('pickup_date', newValue)}
                      style={styles.bumpBottom}
                    />
                  </>
                )}
              </Form>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
      <Spinner show={mutation.isLoading} />
    </Animated.View>
  );
};

Report.propTypes = {
  reportType: propTypes.oneOf([REPORT_TYPES.report, REPORT_TYPES.pickup]).isRequired,
  show: propTypes.bool.isRequired,
  hideReport: propTypes.func.isRequired,
  setHeight: propTypes.func.isRequired,
  setMarker: propTypes.func.isRequired,
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
  body: {
    padding: PADDING * 2,
  },
  header: {
    padding: PADDING * 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: { marginRight: -10 },
  hidden: { display: 'none' },
  bumpBottom: { marginBottom: PADDING },
});

export default Report;
