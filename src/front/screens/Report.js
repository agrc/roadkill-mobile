import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Datepicker,
  NativeDateService,
  Text,
  useTheme,
} from '@ui-kitten/components';
import * as reportSchemas from 'common/validation/reports';
import propTypes from 'prop-types';
import React from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as yup from 'yup';
import FocusAwareStatusBar from '../components/FocusAwareStatusBar';
import Spinner from '../components/Spinner';
import Form from '../components/reports/Form';
import Location from '../components/reports/Location';
import RepeatSubmission from '../components/reports/RepeatSubmission';
import { useAPI } from '../services/api';
import config from '../services/config';
import { getIcon } from '../services/icons';
import t, { locale } from '../services/localization';
import { ACCURACY, getLocation } from '../services/location';
import { useOfflineCache } from '../services/offline';
import { PADDING, RADIUS } from '../services/styles';
import {
  getSubmitValues,
  pointCoordinatesToString,
} from '../services/utilities';

const commonInitialValues = {
  photo: null,
  photo_location: null,
  photo_date: null,
  species_id: null,
  common_name: null,
  scientific_name: null,
  species_type: null,
  species_class: null,
  species_order: null,
  family: null,
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
    discovery_date: new Date(),
  },
  pickup: {
    ...commonInitialValues,
    pickup_date: new Date(),
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
const localDateService =
  locale === 'en'
    ? new NativeDateService('en', { format: 'MM/DD/YYYY' })
    : new NativeDateService('es');

const today = new Date();

const Report = ({
  show,
  reportType,
  hideReport,
  setMarker,
  carcassCoordinates,
  vehicleTrackingDispatch,
  vehicleTrackingState,
}) => {
  const windowDimensions = useWindowDimensions();
  const theme = useTheme();
  const [showMain, setShowMain] = React.useState(false);
  const { cacheReport } = useOfflineCache();

  const { postReport } = useAPI();
  const dateIcon = getIcon({
    pack: 'font-awesome-5',
    name: 'calendar-alt',
  });

  const submitReport = async (values) => {
    console.log('submitReport');

    const submitValues = getSubmitValues(values);

    // add data gathered from outside of the form
    submitValues.animal_location = pointCoordinatesToString(carcassCoordinates);
    submitValues.submit_date = new Date().toISOString();
    const currentLocation = await getLocation(ACCURACY.Highest);
    console.log('got location');
    submitValues.submit_location = pointCoordinatesToString(
      currentLocation.coords,
    );

    // if there is a route being collected and this is a pickup report, then cache the data on the device for later submission
    if (
      vehicleTrackingState.isTracking &&
      reportType === config.REPORT_TYPES.pickup
    ) {
      vehicleTrackingDispatch({ type: 'ADD_PICKUP', payload: submitValues });

      Alert.alert(
        t('success'),
        t('screens.report.routeReportSubmissionSuccess'),
        [
          {
            text: t('ok'),
            onPress: () => onClose(true),
          },
        ],
      );

      return;
    }

    // do an explicit NetInfo.fetch() here so that I get the most reliable connection status
    if (!(await NetInfo.fetch()).isInternetReachable) {
      await cacheReport(submitValues);

      onClose(true);

      return;
    }

    let responseJson;
    try {
      responseJson = await postReport(submitValues, reportType);
    } catch (error) {
      console.log('error posting report, caching offline', error);
      await cacheReport(submitValues, error);

      onClose(true);

      return;
    }

    console.log('responseJson.report_id', responseJson.report_id);

    const successMessages = {
      pickup: t('screens.report.pickupSuccess'),
      report: t('screens.report.publicReportSuccess'),
    };

    Alert.alert(t('success'), successMessages[reportType], [
      {
        text: t('ok'),
        onPress: () => onClose(true),
      },
    ]);
  };

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: submitReport,
    onSuccess: () => {
      queryClient.invalidateQueries(config.QUERY_KEYS.submissions);
      queryClient.invalidateQueries(config.QUERY_KEYS.profile);
    },
    onError: (error) => {
      Alert.alert(t('error'), error);
    },
  });

  const isDirty = () => {
    return carcassCoordinates !== null || formikRef.current?.dirty;
  };

  const onClose = async (force = false) => {
    const close = () => {
      Keyboard.dismiss();
      hideReport();
      setShowMain(false);
      formikRef.current?.resetForm();
    };

    if (!force && isDirty()) {
      Alert.alert(t('areYouSure'), t('screens.report.discardWarning'), [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('screens.report.discardReport'),
          onPress: () => close(),
        },
      ]);
    } else {
      close();
    }
  };

  const onSetLocation = () => {
    setMarker();

    setTimeout(() => setShowMain(true), 600);
  };

  // set up form
  const reportFormikRef = React.useRef(null);
  const pickupFormikRef = React.useRef(null);
  const formikRef =
    reportType === config.REPORT_TYPES.report
      ? reportFormikRef
      : pickupFormikRef;

  React.useEffect(() => {
    if (show) {
      // reset the default date values on form open
      initialFormValues.report.discovery_date = new Date();
      initialFormValues.pickup.pickup_date = new Date();
    }
  }, [show]);

  const containerStyle = {
    ...styles.container,
    backgroundColor: theme['color-basic-100'],
    borderColor: theme['color-basic-400'],
    elevation: 5,
    maxHeight: showMain
      ? windowDimensions.height
      : windowDimensions.height * 0.5,
  };
  if (!showMain) {
    containerStyle.borderTopLeftRadius = RADIUS;
    containerStyle.borderTopRightRadius = RADIUS;
  }

  const onRepeatChange = (newValue) => {
    formikRef.current.setFieldValue('repeat_submission', newValue);
  };

  const onDiscoveryDateChange = (newValue) =>
    formikRef.current.setFieldValue('discovery_date', newValue);

  const onPickupDateChange = (newValue) =>
    formikRef.current.setFieldValue('pickup_date', newValue);

  return show ? (
    <Animated.View
      entering={SlideInDown}
      exiting={SlideOutDown}
      style={[containerStyle, { paddingTop: showMain ? 50 : null }]}
    >
      <KeyboardAwareScrollView
        enableOnAndroid={true}
        extraScrollHeight={PADDING + 5}
        scrollEnabled={showMain}
      >
        <View style={styles.body}>
          {!showMain ? (
            <Location onSetLocation={onSetLocation} onCancel={onClose} />
          ) : (
            <FocusAwareStatusBar style={'dark'} />
          )}

          {
            // the Form components are wrapped in a view and hidden via styling
            // to prevent them from being remounted when they are hidden
          }
          <View style={showMain ? null : styles.hidden}>
            {reportType === config.REPORT_TYPES.report ? (
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
                {({ values }) => (
                  <>
                    <RepeatSubmission
                      checked={values.repeat_submission}
                      onChange={onRepeatChange}
                      cancelReport={onClose}
                      style={styles.bumpBottom}
                    />
                    <Text category="h6">
                      {t('screens.report.whenDiscovered')}
                    </Text>
                    <Datepicker
                      accessoryRight={dateIcon}
                      date={values.discovery_date}
                      dateService={localDateService}
                      max={today}
                      onSelect={onDiscoveryDateChange}
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
                {({ values }) => (
                  <>
                    <Text category="h6">
                      {t('screens.report.whenPickedUp')}
                    </Text>
                    <Datepicker
                      accessoryRight={dateIcon}
                      date={values.pickup_date}
                      dateService={localDateService}
                      max={today}
                      onSelect={onPickupDateChange}
                      style={styles.bumpBottom}
                    />
                  </>
                )}
              </Form>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
      <Spinner show={mutation.isPending} />
    </Animated.View>
  ) : null;
};

Report.propTypes = {
  reportType: propTypes.oneOf([
    config.REPORT_TYPES.report,
    config.REPORT_TYPES.pickup,
  ]).isRequired,
  show: propTypes.bool.isRequired,
  hideReport: propTypes.func.isRequired,
  setMarker: propTypes.func.isRequired,
  carcassCoordinates: propTypes.object,
  vehicleTrackingDispatch: propTypes.func.isRequired,
  vehicleTrackingState: propTypes.object.isRequired,
};

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
  hidden: { display: 'none' },
  bumpBottom: { marginBottom: PADDING },
});

export default Report;
