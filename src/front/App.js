import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry, Text } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import * as React from 'react';
import { connectToDevTools } from 'react-devtools-core';
import { LogBox, View } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import 'react-native-get-random-values';
import { QueryClient, QueryClientProvider } from 'react-query';
import * as Sentry from 'sentry-expo';
import { AuthContextProvider } from './auth/context';
import AppNavigator from './components/AppNavigator';
import theme from './custom-theme.json';
import mapping from './mapping.json';
import packs from './services/icons';
import { OfflineCacheContextProvider } from './services/offline';

console.log('starting up...');
const queryClient = new QueryClient();

Sentry.init({
  dsn: 'https://2a36299ed52445d3b8c2817800c39dc7@o297301.ingest.sentry.io/5880366',
  environment: Updates.releaseChannel,
});

if (__DEV__) {
  /*
    react-query causes these types of logs to be shown but they say that they are nothing to worry about
    this may be able to be removed after upgrading to RN 0.65
    ref: https://github.com/tannerlinsley/react-query/issues/1259
  */
  LogBox.ignoreLogs(['Setting a timer']);

  // set up flipper
  connectToDevTools({
    host: 'localhost',
    port: 8097,
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
      <ApplicationProvider {...eva} customMapping={mapping} theme={{ ...eva.light, ...theme }}>
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
