import { useFocusEffect } from '@react-navigation/native';
import { Button, Divider, Layout, Text } from '@ui-kitten/components';
import { nativeApplicationVersion } from 'expo-application';
import { brand, modelName, osVersion } from 'expo-device';
import { channel, checkForUpdateAsync, fetchUpdateAsync, manifest, reloadAsync, runtimeVersion } from 'expo-updates';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import 'yup-phone';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
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
      const updateCheckResult = await checkForUpdateAsync();
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
          The Utah Wildlife-Vehicle Collision Reporter app (WVCR) is a smartphone-based system for reporting animals
          that have been involved in vehicle collisions. Data collected from this app will allow UDWR and UDOT to reduce
          wildlife-vehicle collisions and make highways safer for drivers and wildlife.
        </Text>
        <Text category="h5" style={styles.header}>
          App
        </Text>
        <Divider />
        <ValueContainer label="Application Version" value={nativeApplicationVersion} />
        <ValueContainer label="Runtime Version" value={runtimeVersion} />
        <ValueContainer label="Build Number" value={manifest?.extra?.expoClient?.ios?.buildNumber || ''} />
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
