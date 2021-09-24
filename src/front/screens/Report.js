import { Button, Card, Text, useTheme } from '@ui-kitten/components';
import * as reportSchemas from 'common/validation/reports';
import propTypes from 'prop-types';
import React from 'react';
import { Alert, Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as yup from 'yup';
import Form from '../components/reports/Form';
import Location from '../components/reports/Location';
import PhotoCapture from '../components/reports/PhotoCapture';
import RepeatSubmission from '../components/reports/RepeatSubmission';
import Spinner from '../components/Spinner';
import { getIcon } from '../icons';

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
};
const initialFormValues = {
  // skip values that are gathered outside of the form
  report: {
    ...commonInitialValues,
    repeat_submission: false,
  },
  pickup: {
    ...commonInitialValues,
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

const Report = ({ show, reportType, hideReport, setHeight, setMarker, carcassCoordinates }) => {
  const animatedMaxHeight = React.useRef(new Animated.Value(0));
  const windowDimensions = useWindowDimensions();
  const theme = useTheme();
  const locationViewHeight = React.useRef(null);
  const [view, setView] = React.useState(SET_LOCATION_VIEW);
  const [showMain, setShowMain] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

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
        onPress={() => onClose()}
        style={styles.closeButton}
      />
    </View>
  );
  Header.propTypes = {
    style: propTypes.array,
  };

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

  const onEditLocation = () => {
    setView(SET_LOCATION_VIEW);
  };

  // set up form
  const reportFormikRef = React.useRef(null);
  const pickupFormikRef = React.useRef(null);
  const formikRef = reportType === REPORT_TYPES.report ? reportFormikRef : pickupFormikRef;

  const onPhotoChange = (newPhotoProps) => {
    console.log('onPhotoChange', newPhotoProps);
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
    <Animated.View
      // The reason why I'm doing maxHeight rather than height is because we can't find the
      // height of the animated view until it's displayed. A fixed height would not be flexible
      // enough for different screen sizes.
      style={[styles.container, { maxHeight: animatedMaxHeight.current }]}
      onLayout={(event) => (locationViewHeight.current = event.nativeEvent.layout.height)}
    >
      <Card style={styles.card} header={Header} disabled>
        <Location onSetLocation={onSetLocation} onEditLocation={onEditLocation} showEdit={!showMain} />
        {showMain ? (
          <View style={{ height: windowDimensions.height }}>
            {reportType === REPORT_TYPES.report ? (
              // report form
              <Form
                key="report-form"
                formikRef={reportFormikRef}
                initialValues={initialFormValues.report}
                validationSchema={formSchemas.report}
                carcassCoordinates={carcassCoordinates}
                reportType={reportType}
                onClose={onClose}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              >
                {({ values, setFieldValue }) => (
                  <>
                    <RepeatSubmission
                      checked={values.repeat_submission}
                      onChange={(newValue) => setFieldValue('repeat_submission', newValue)}
                      cancelReport={() => onClose()}
                    />
                    <PhotoCapture
                      isRequired={formSchemas.report.fields.photo.spec.presence === 'required'}
                      onChange={onPhotoChange}
                      uri={values.photo?.uri}
                    />
                  </>
                )}
              </Form>
            ) : (
              // pickup form
              <Form
                key="pickup-form"
                formikRef={pickupFormikRef}
                initialValues={initialFormValues.pickup}
                validationSchema={formSchemas.pickup}
                carcassCoordinates={carcassCoordinates}
                reportType={reportType}
                onClose={onClose}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              >
                {({ values }) => (
                  <>
                    <PhotoCapture
                      isRequired={formSchemas.pickup.fields.photo.spec.presence === 'required'}
                      onChange={onPhotoChange}
                      uri={values.photo?.uri}
                    />
                  </>
                )}
              </Form>
            )}
          </View>
        ) : null}
      </Card>
      <Spinner show={isLoading} />
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
