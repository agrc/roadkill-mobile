import * as eva from '@eva-design/eva';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApplicationProvider, IconRegistry, Text } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import 'react-native-get-random-values';
import { enableLatestRenderer } from 'react-native-maps';
import * as Sentry from 'sentry-expo';
import { AuthContextProvider } from './auth/context';
import AppNavigator from './components/AppNavigator';
import theme from './custom-theme.json';
import mapping from './mapping.json';
import packs from './services/icons';
import { OfflineCacheContextProvider } from './services/offline';

// https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md#using-the-new-google-maps-renderer
enableLatestRenderer();

console.log('starting up...');
const queryClient = new QueryClient();

// https://github.com/expo/sentry-expo/issues/347#issuecomment-1712008457
if (__DEV__) {
  if (!global.sentryInit) {
    Sentry.init({
      dsn: 'https://2a36299ed52445d3b8c2817800c39dc7@o297301.ingest.sentry.io/5880366',
      environment: Constants.expoConfig.extra.ENVIRONMENT,
    });
    global.sentryInit = true;
  }
} else {
  Sentry.init({
    dsn: 'https://2a36299ed52445d3b8c2817800c39dc7@o297301.ingest.sentry.io/5880366',
    environment: Constants.expoConfig.extra.ENVIRONMENT,
  });
}

export default function App() {
  const [authIsReady, setAuthIsReady] = React.useState(false);
  const splashIsHidden = React.useRef(false);

  React.useEffect(() => {
    if (!splashIsHidden.current) {
      SplashScreen.preventAutoHideAsync();
    }
  }, []);

  const onReady = () => {
    console.log('onReady', authIsReady, splashIsHidden.current);
    if (authIsReady && !splashIsHidden.current) {
      SplashScreen.hideAsync();
      splashIsHidden.current = true;
    }
  };

  const onError = (error) => {
    Sentry.Native.captureException(error);
    SplashScreen.hideAsync();
  };

  return (
    <ErrorBoundary onError={onError}>
      <IconRegistry icons={[EvaIconsPack, ...packs]} />
      <ApplicationProvider
        {...eva}
        customMapping={mapping}
        theme={{ ...eva.light, ...theme }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthContextProvider onReady={() => setAuthIsReady(true)}>
            {authIsReady ? (
              <View onLayout={onReady} style={{ flex: 1 }}>
                <OfflineCacheContextProvider>
                  <AppNavigator />
                </OfflineCacheContextProvider>
              </View>
            ) : (
              <Text>Loading...</Text>
            )}
          </AuthContextProvider>
        </QueryClientProvider>
      </ApplicationProvider>
      <StatusBar style="dark" />
    </ErrorBoundary>
  );
}
