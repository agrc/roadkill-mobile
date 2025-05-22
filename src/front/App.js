import * as eva from '@eva-design/eva';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import 'react-native-get-random-values';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContextProvider } from './auth/context';
import AppNavigator from './components/AppNavigator';
import Spinner from './components/Spinner';
import theme from './custom-theme.json';
import mapping from './mapping.json';
import packs from './services/icons';
import t from './services/localization';
import { OfflineCacheContextProvider } from './services/offline';

console.log('starting up...');
const queryClient = new QueryClient();

Sentry.init({
  dsn: 'https://2a36299ed52445d3b8c2817800c39dc7@o297301.ingest.sentry.io/5880366',
  environment: Constants.expoConfig.extra.ENVIRONMENT,
});

SplashScreen.preventAutoHideAsync();

function App() {
  const [authIsReady, setAuthIsReady] = React.useState(false);
  const splashIsHidden = React.useRef(false);

  const onReady = () => {
    console.log('onReady', authIsReady, splashIsHidden.current);
    if (authIsReady && !splashIsHidden.current) {
      SplashScreen.hideAsync();
      splashIsHidden.current = true;
    }
  };

  const onError = (error) => {
    Sentry.captureException(error);
    SplashScreen.hideAsync();
  };

  return (
    <ErrorBoundary onError={onError}>
      <KeyboardProvider>
        <SafeAreaProvider>
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
                  <Spinner show={true} message={t('loading.initializingApp')} />
                )}
              </AuthContextProvider>
            </QueryClientProvider>
          </ApplicationProvider>
        </SafeAreaProvider>
        <StatusBar style="dark" />
      </KeyboardProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);
