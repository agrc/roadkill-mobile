import { Button, Text, useTheme } from '@ui-kitten/components';
import { manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { unregisterAllTasksAsync } from 'expo-task-manager';
import { reloadAsync } from 'expo-updates';
import mime from 'mime';
import propTypes from 'prop-types';
import { memo, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import * as Sentry from 'sentry-expo';
import config from '../../services/config';
import { getIcon } from '../../services/icons';
import t from '../../services/localization';
import { ACCURACY, getLocation } from '../../services/location';
import useStyles, { PADDING } from '../../services/styles';
import {
  pointCoordinatesToString,
  useAsyncError,
} from '../../services/utilities';
import Spinner from '../Spinner';
import { getCoordinatesFromExif, getDateFromExif } from './photoUtils';

const THUMBNAIL_SIZE = 110;

const displayCameraActivityFailedAlert = () => {
  Alert.alert(
    t('components.reports.photoCapture.openCameraFailedTitle'),
    t('components.reports.photoCapture.openCameraFailedMessage'),
    [
      {
        text: t('cancel'),
      },
      {
        text: t('ok'),
        onPress: async () => {
          await unregisterAllTasksAsync();
          await reloadAsync();
        },
      },
    ],
  );
};

async function resizeImage(uri, width, height) {
  let newUri;
  const largestDimension = width > height ? 'width' : 'height';
  try {
    const result = await manipulateAsync(
      uri,
      [
        {
          resize: {
            [largestDimension]: config.IMAGE_MAX_DIMENSION,
          },
        },
      ],
      {
        compress: config.IMAGE_COMPRESSION_QUALITY,
      },
    );

    newUri = result.uri;
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    newUri = uri;
  }

  return newUri;
}

function PhotoCapture({ onChange, uri, style, setPhotoIsProcessing }) {
  const [showLoader, setShowLoader] = useState(false);
  const theme = useTheme();
  const commonStyles = useStyles();
  const throwAsyncError = useAsyncError();

  const photoOptions = {
    quality: config.IMAGE_COMPRESSION_QUALITY,
    exif: true,
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), `status: ${status}`);
      // 'Media library permissions are required chose a photo.'

      return;
    }

    // For `ImagePicker.launchImageLibraryAsync`: there may be issues with this on android if the memory on the device is low.
    // I'm not sure that there is a great solution for this app since the app reboots and it's
    // not set up to go back to the report screen. I'm going to just leave it as is for now and wait
    // until we have users running into it. I'm guessing that most users will be capturing new photos anyways.
    // Ref: https://github.com/expo/expo/issues/11103
    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync(photoOptions);
    } catch (error) {
      throwAsyncError(error);
    }

    if (!result.canceled && result.assets.length > 0) {
      const { uri, exif, width, height } = result.assets[0];

      const coordinates = pointCoordinatesToString(
        getCoordinatesFromExif(exif),
      );

      const compressedUri = await resizeImage(uri, width, height);

      onChange({
        uri: compressedUri,
        type: mime.getType(compressedUri),
        name: 'photo',
        coordinates,
        date: getDateFromExif(exif),
      });
    }
  };

  const captureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      // 'Cameral permissions are required to take a new photo.'
      Alert.alert(t('error'), `status: ${status}`);

      return;
    }

    let result;
    try {
      result = await ImagePicker.launchCameraAsync(photoOptions);
    } catch (error) {
      if (
        error.message.includes(
          "Call to function 'ExponentImagePicker.launchCameraAsync' has been rejected",
        )
      ) {
        displayCameraActivityFailedAlert();
      } else {
        throwAsyncError(error);
      }
    }

    if (!result.canceled && result.assets.length > 0) {
      const { uri, exif, width, height } = result.assets[0];

      // on iOS when capturing a new image, the GPS tags are not included in the exif data.
      // might as well get them on both platforms when taking a new image
      let coordinates = null;
      setShowLoader(true);
      try {
        const { coords } = await getLocation(ACCURACY.Highest);
        coordinates = pointCoordinatesToString(coords);
      } catch (error) {
        console.error(error);
        // ignore
      }

      const compressedUri = await resizeImage(uri, width, height);

      onChange({
        uri: compressedUri,
        type: mime.getType(compressedUri),
        name: 'photo',
        coordinates,
        date: getDateFromExif(exif),
      });
    }

    setShowLoader(false);
  };

  const PlaceholderIcon = getIcon({
    pack: 'font-awesome',
    name: 'photo',
    size: 50,
    color: theme['color-basic-400'],
  });

  return (
    <View style={style}>
      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <Button
            accessoryLeft={getIcon({
              pack: 'font-awesome',
              name: 'camera',
              color: theme['color-basic-800'],
            })}
            onPress={() => {
              setPhotoIsProcessing(true);
              captureImage().finally(() => {
                setPhotoIsProcessing(false);
              });
            }}
          >
            {t('components.reports.photoCapture.takeNewPhoto')}
          </Button>
          <Button
            accessoryLeft={getIcon({
              pack: 'font-awesome',
              name: 'photo',
              color: theme['color-basic-800'],
            })}
            onPress={() => {
              setPhotoIsProcessing(true);
              pickImage().finally(() => {
                setPhotoIsProcessing(false);
              });
            }}
            style={{ marginTop: PADDING }}
          >
            {t('components.reports.photoCapture.chooseExisting')}
          </Button>
        </View>

        {uri ? (
          <>
            <Image
              source={{ uri }}
              style={[commonStyles.image, styles.image]}
              height={THUMBNAIL_SIZE}
              width={THUMBNAIL_SIZE}
            />
            <Button
              size="tiny"
              accessoryLeft={getIcon({
                pack: 'font-awesome',
                name: 'remove',
                size: 25,
              })}
              appearance="ghost"
              status="danger"
              onPress={() => onChange(null)}
              style={styles.removeIcon}
            />
          </>
        ) : (
          <View
            style={[
              commonStyles.image,
              styles.image,
              styles.placeholderContainer,
            ]}
          >
            <PlaceholderIcon />
          </View>
        )}
        <Spinner show={showLoader} />
      </View>
      <Text appearance="hint">
        {t('components.reports.photoCapture.pleaseTake')}
      </Text>
    </View>
  );
}

PhotoCapture.propTypes = {
  uri: propTypes.string,
  onChange: propTypes.func.isRequired,
  style: propTypes.oneOfType([propTypes.object, propTypes.array]),
  setPhotoIsProcessing: propTypes.func.isRequired,
};

export default memo(PhotoCapture);

const styles = StyleSheet.create({
  container: {
    marginTop: PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  buttonContainer: {
    flex: 1,
    marginRight: PADDING,
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
});
