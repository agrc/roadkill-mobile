import { Button, Text, useTheme } from '@ui-kitten/components';
import * as ImagePicker from 'expo-image-picker';
import propTypes from 'prop-types';
import React from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, View } from 'react-native';
import config from '../../config';
import { getIcon } from '../../icons';
import { getLocation } from '../../location';
import useStyles from '../../styles';

const THUMBNAIL_SIZE = 100;
export function getCoordinatesFromExif(exif) {
  if (exif?.GPSLatitude && exif?.GPSLongitude) {
    let longitude = parseFloat(exif.GPSLongitude, 10);
    let latitude = parseFloat(exif.GPSLatitude, 10);
    longitude = longitude < 0 ? longitude : -longitude;

    return [latitude, longitude];
  }

  return null;
}

export function getDateFromExif(exif) {
  if (exif?.DateTimeOriginal) {
    const parts = exif.DateTimeOriginal.split(' ');
    const dateString = `${parts[0].replace(/:/g, '-')}T${parts[1]}Z`;

    return new Date(dateString);
  }

  return null;
}

export default function PhotoCapture({ isRequired, onChange, value }) {
  const [showLoader, setShowLoader] = React.useState(false);
  const theme = useTheme();
  const commonStyles = useStyles();

  const getImageAsync = async (requestPermissionsAsync, getImageFunctionAsync, permissionsJustification) => {
    const { status } = await requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', permissionsJustification);

      return;
    }

    const photoOptions = {
      quality: config.IMAGE_COMPRESSION_QUALITY,
      exif: true,
    };

    // For `ImagePicker.launchImageLibraryAsync`: there may be issues with this on android if the memory on the device is low.
    // I'm not sure that there is a great solution for this app since the app reboots and it's
    // not set up to go back to the report screen. I'm going to just leave it as is for now and wait
    // until we have users running into it. I'm guessing that most users will be capturing new photos anyways.
    // Ref: https://github.com/expo/expo/issues/11103
    const result = await getImageFunctionAsync(photoOptions);

    if (!result.cancelled) {
      const { uri, exif, type } = result;

      // on iOS when capturing a new image, the GPS tags are not included in the exif data.
      // might as well get them on both platforms when taking a new image
      let coordinates = null;
      if (getImageFunctionAsync == ImagePicker.launchCameraAsync) {
        setShowLoader(true);
        try {
          const { coords } = await getLocation();
          coordinates = [coords.latitude, coords.longitude];
        } catch (error) {
          console.error(error);
          // ignore
        }
      } else {
        coordinates = getCoordinatesFromExif(exif);
      }

      onChange({
        uri,
        type,
        name: 'photo',
        coordinates,
        date: getDateFromExif(exif),
      });
    }

    setShowLoader(false);
  };

  const pickImage = async () => {
    return await getImageAsync(
      ImagePicker.requestMediaLibraryPermissionsAsync,
      ImagePicker.launchImageLibraryAsync,
      'Cameral roll permissions are required to chose an existing photo.'
    );
  };

  const captureImage = async () => {
    return await getImageAsync(
      ImagePicker.requestCameraPermissionsAsync,
      ImagePicker.launchCameraAsync,
      'Cameral permissions are required to take a new photo.'
    );
  };

  const PlaceholderIcon = getIcon({ pack: 'font-awesome', name: 'photo', size: 50, color: theme['color-basic-400'] });

  return (
    <>
      <Text category="h6">Photo</Text>
      {isRequired ? (
        <Text appearance="hint">A photo of the animal at the pick up location is required.</Text>
      ) : (
        <Text appearance="hint">If possible and safe, please take a photo.</Text>
      )}

      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <Button accessoryLeft={getIcon({ pack: 'font-awesome', name: 'camera' })} onPress={captureImage}>
            Take new photo
          </Button>
          <Button accessoryLeft={getIcon({ pack: 'font-awesome', name: 'photo' })} onPress={pickImage}>
            Choose existing image
          </Button>
        </View>

        {value?.uri ? (
          <>
            <Image
              source={{ uri: value.uri }}
              style={[commonStyles.image, styles.image]}
              height={THUMBNAIL_SIZE}
              width={THUMBNAIL_SIZE}
            />
            <Button
              size="tiny"
              accessoryLeft={getIcon({ pack: 'font-awesome', name: 'remove', size: 25 })}
              appearance="ghost"
              status="danger"
              onPress={() => onChange(null)}
              style={styles.removeIcon}
            />
          </>
        ) : (
          <View style={[commonStyles.image, styles.image, styles.placeholderContainer]}>
            <PlaceholderIcon />
          </View>
        )}
        {showLoader ? (
          <View
            style={[
              styles.loader,
              commonStyles.roundedBorders,
              { backgroundColor: theme['color-basic-transparent-600'] },
            ]}
          >
            <ActivityIndicator color={theme['color-basic-1100']} size="large" />
          </View>
        ) : null}
      </View>
    </>
  );
}

PhotoCapture.propTypes = {
  isRequired: propTypes.bool.isRequired,
  value: propTypes.shape({
    uri: propTypes.string.isRequired,
    type: propTypes.string.isRequired,
    name: propTypes.string.isRequired,
    coordinates: propTypes.arrayOf(propTypes.number),
    date: propTypes.instanceOf(Date).isRequired,
  }),
  onChange: propTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonContainer: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'space-between',
  },
  image: {
    height: THUMBNAIL_SIZE,
    width: THUMBNAIL_SIZE,
  },
  removeIcon: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    position: 'absolute',
    top: 2,
    right: 0,
  },
  placeholderContainer: {
    height: THUMBNAIL_SIZE,
    width: THUMBNAIL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
