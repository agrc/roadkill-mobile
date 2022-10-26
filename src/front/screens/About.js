import { useFocusEffect } from '@react-navigation/native';
import { Button, Divider, Layout, Text } from '@ui-kitten/components';
import Constants from 'expo-constants';
import { brand, modelName, osVersion } from 'expo-device';
import { channel, checkForUpdateAsync, fetchUpdateAsync, reloadAsync } from 'expo-updates';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import 'yup-phone';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import { clearBaseMapCache, getBaseMapCacheSize } from '../services/offline';
import { PADDING } from '../services/styles';
import { getReleaseChannelBranch } from '../services/utilities';

async function forceUpdate() {
  const updateCheckResult = await checkForUpdateAsync();
  if (updateCheckResult.isAvailable) {
    await fetchUpdateAsync();
    await reloadAsync();
  } else {
    Alert.alert('No update available', 'You are already running the latest version of the app.');
  }
}

export default function AppInfoScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [cacheSize, setCacheSize] = useState('calculating...');

  useFocusEffect(() => {
    const getSize = async () => {
      const size = await getBaseMapCacheSize();
      setCacheSize(size);
    };
    getSize();
  });

  const handleClearCache = async () => {
    setIsLoading(true);
    await clearBaseMapCache();

    setCacheSize(await getBaseMapCacheSize());
    setIsLoading(false);
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
        <ValueContainer label="Application Version" value={Constants.manifest2.extra.expoClient.version} />
        <ValueContainer label="Runtime Version" value={Constants.manifest2.runtimeVersion} />
        <ValueContainer label="Build Number" value={Constants.manifest2.extra.expoClient.ios?.buildNumber} />
        <ValueContainer label="Release Channel" value={getReleaseChannelBranch(channel)} />

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
      <Spinner show={isLoading} message={'Deleting cache files...'} />
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
