import { Button, Divider, Layout, Text } from '@ui-kitten/components';
import { nativeApplicationVersion } from 'expo-application';
import Constants from 'expo-constants';
import { brand, modelName, osVersion } from 'expo-device';
import {
  channel,
  checkForUpdateAsync,
  fetchUpdateAsync,
  manifest,
  reloadAsync,
  runtimeVersion,
} from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import 'yup-phone-lite';
import Spinner from '../components/Spinner';
import ValueContainer from '../components/ValueContainer';
import config from '../services/config';
import t from '../services/localization';
import { PADDING } from '../services/styles';

const updateMessage = t('screens.about.checkingForUpdates');
console.log('manifest from Updates', JSON.stringify(manifest, null, 2));

export default function AppInfoScreen() {
  const [loaderMessage, setLoaderMessage] = useState(null);

  async function forceUpdate() {
    setLoaderMessage(updateMessage);

    if (__DEV__) {
      Alert.alert('Cannot update in development mode.');
    } else {
      let updateCheckResult;
      try {
        updateCheckResult = await checkForUpdateAsync();
      } catch (e) {
        Alert.alert(
          t('screens.about.noUpdateAvailable'),
          t('screens.about.noUpdateDescription'),
        );

        setLoaderMessage(null);

        return;
      }

      if (updateCheckResult.isAvailable) {
        await fetchUpdateAsync();
        await reloadAsync();
      } else {
        Alert.alert(
          t('screens.about.noUpdateAvailable'),
          t('screens.about.alreadyLatest'),
        );
      }
    }

    setLoaderMessage(null);
  }

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.paragraph} category="p1">
          {t('screens.about.description')}
        </Text>

        <Text category="h5" style={styles.header}>
          {t('screens.about.app')}
        </Text>
        <Divider />
        <ValueContainer
          label={t('screens.about.appVersion')}
          value={nativeApplicationVersion}
        />
        <ValueContainer
          label={t('screens.about.runtimeVersion')}
          value={runtimeVersion}
        />
        <ValueContainer
          label={t('screens.about.buildNumber')}
          value={Constants.expoConfig.ios.buildNumber || ''}
        />
        <ValueContainer
          label={t('screens.about.releaseChannel')}
          value={channel || 'dev'}
        />

        <View style={styles.buttonContainer}>
          <Button onPress={forceUpdate}>
            {t('screens.about.forceUpdate')}
          </Button>
        </View>

        <Text category="h5" style={styles.header}>
          {t('screens.about.device')}
        </Text>
        <Divider />
        <ValueContainer label={t('screens.about.brand')} value={brand} />
        <ValueContainer label={t('screens.about.model')} value={modelName} />
        <ValueContainer
          label={t('screens.about.osVersion')}
          value={osVersion}
        />

        <Text category="h5" style={styles.header}>
          {t('screens.about.offlineMaps')}
        </Text>
        <Text
          style={[styles.paragraph, { paddingTop: 0, paddingBottom: PADDING }]}
          category="p1"
        >
          {t('screens.about.offlineMapsDescription')}
        </Text>
        <Divider />

        {/* Facebook requires a link to the privacy policy in the app */}
        <View style={[styles.buttonContainer, { marginBottom: PADDING * 2 }]}>
          <Button
            status="basic"
            onPress={() =>
              WebBrowser.openBrowserAsync(`${config.WEBSITE}/privacy-policy`)
            }
          >
            {t('screens.about.privacyPolicy')}
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
