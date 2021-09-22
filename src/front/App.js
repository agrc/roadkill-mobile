import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import * as React from 'react';
import { View } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import 'react-native-get-random-values';
import { QueryClient, QueryClientProvider } from 'react-query';
import * as Sentry from 'sentry-expo';
import AppNavigator from './AppNavigator';
import { AuthContextProvider } from './auth/context';
import { default as theme } from './custom-theme.json';
import packs from './icons';

const queryClient = new QueryClient();

Sentry.init({
  dsn: 'https://2a36299ed52445d3b8c2817800c39dc7@o297301.ingest.sentry.io/5880366',
  environment: Updates.releaseChannel,
});

export default function App() {
  const [authIsReady, setAuthIsReady] = React.useState(false);
  const splashIsHidden = React.useRef(false);

  React.useEffect(() => {
    if (!splashIsHidden.current) {
      SplashScreen.preventAutoHideAsync();
    }
  }, []);

  const onReady = () => {
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
      <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
        <QueryClientProvider client={queryClient}>
          <AuthContextProvider onReady={() => setAuthIsReady(true)}>
            {authIsReady ? (
              <View onLayout={onReady} style={{ flex: 1 }}>
                <AppNavigator />
              </View>
            ) : null}
          </AuthContextProvider>
        </QueryClientProvider>
      </ApplicationProvider>
    </ErrorBoundary>
  );
}
