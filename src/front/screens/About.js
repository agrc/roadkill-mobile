import { useFocusEffect } from '@react-navigation/native';
import { Button, Divider, Layout, Text } from '@ui-kitten/components';
import { nativeApplicationVersion } from 'expo-application';
import Constants from 'expo-constants';
import { brand, modelName, osVersion } from 'expo-device';
import { channel, checkForUpdateAsync, fetchUpdateAsync, manifest, reloadAsync, runtimeVersion } from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import 'yup-phone-lite';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import config from '../services/config';
import { clearBaseMapCache, getBaseMapCacheSize } from '../services/offline';
import { PADDING } from '../services/styles';

const deleteCacheMessage = 'Deleting cache files...';
const updateMessage = 'Checking for updates...';
console.log('manifest from Updates', JSON.stringify(manifest, null, 2));

export default function AppInfoScreen() {
  const [loaderMessage, setLoaderMessage] = useState(null);
  const [cacheSize, setCacheSize] = useState('calculating...');

  async function forceUpdate() {
    setLoaderMessage(updateMessage);

    if (__DEV__) {
      Alert.alert('Cannot update in development mode.');
    } else {
      let updateCheckResult;
      try {
        updateCheckResult = await checkForUpdateAsync();
      } catch (e) {
        Alert.alert('No update available', 'No over-the-air updates have been published for this version.');

        setLoaderMessage(null);

        return;
      }

      if (updateCheckResult.isAvailable) {
        await fetchUpdateAsync();
        await reloadAsync();
      } else {
        Alert.alert('No update available', 'You are already running the latest version of the app.');
      }
    }

    setLoaderMessage(null);
  }

  useFocusEffect(() => {
    const getSize = async () => {
      const size = await getBaseMapCacheSize();
      setCacheSize(size);
    };
    getSize();
  });

  const handleClearCache = async () => {
    setLoaderMessage(deleteCacheMessage);
    await clearBaseMapCache();

    setCacheSize(await getBaseMapCacheSize());
    setLoaderMessage(null);
  };

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.paragraph} category="p1">
          The Utah Roadkill Reporter app is a smartphone-based system for reporting animals that have been involved in
          vehicle collisions. Data collected from this app will allow UDWR and UDOT to reduce wildlife-vehicle
          collisions and make highways safer for drivers and wildlife.
        </Text>

        <Text category="h5" style={styles.header}>
          App
        </Text>
        <Divider />
        <ValueContainer label="Application Version" value={nativeApplicationVersion} />
        <ValueContainer label="Runtime Version" value={runtimeVersion} />
        <ValueContainer label="Build Number" value={Constants.expoConfig.ios.buildNumber || ''} />
        <ValueContainer label="Release Channel" value={channel || 'dev'} />

        <View style={styles.buttonContainer}>
          <Button onPress={forceUpdate}>Force App Update</Button>
        </View>

        <Text category="h5" style={styles.header}>
          Device
        </Text>
        <Divider />
        <ValueContainer label="Brand" value={brand} />
        <ValueContainer label="Model" value={modelName} />
        <ValueContainer label="OS Version" value={osVersion} />

        <Text category="h5" style={styles.header}>
          Offline Base Map Cache
        </Text>
        <Divider />
        <ValueContainer label="Size" value={cacheSize} />
        <View style={styles.buttonContainer}>
          <Button onPress={handleClearCache}>Clear Cache</Button>
        </View>

        {/* Facebook requires a link to the privacy policy in the app */}
        <View style={[styles.buttonContainer, { marginBottom: PADDING * 2 }]}>
          <Button status="basic" onPress={() => WebBrowser.openBrowserAsync(`${config.WEBSITE}/privacy-policy`)}>
            Privacy Policy
          </Button>
        </View>
      </ScrollView>
      <Spinner show={!!loaderMessage} message={loaderMessage} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    margin: PADDING,
    marginTop: PADDING * 2,
  },
  buttonContainer: {
    padding: PADDING,
    paddingTop: PADDING * 2,
  },
  paragraph: {
    paddingHorizontal: PADDING,
    paddingTop: PADDING,
    textAlign: 'justify',
  },
});
