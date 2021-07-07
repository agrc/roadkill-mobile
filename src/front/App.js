import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { View } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import 'react-native-get-random-values';
import AppNavigator from './AppNavigator';
import { AuthContextProvider } from './auth/context';
import { default as theme } from './custom-theme.json';

if (__DEV__) {
  import('./ReactotronConfig').then(() => console.log('Reactotron Configured'));
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
    if (authIsReady && !splashIsHidden.current) {
      console.log('hide splash');
      SplashScreen.hideAsync();
      splashIsHidden.current = true;
    }
  };

  return (
    <>
      <ErrorBoundary>
        <IconRegistry icons={EvaIconsPack} />
        <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
          <AuthContextProvider onReady={() => setAuthIsReady(true)}>
            {authIsReady ? (
              <View onLayout={onReady} style={{ flex: 1 }}>
                <AppNavigator />
              </View>
            ) : null}
          </AuthContextProvider>
        </ApplicationProvider>
      </ErrorBoundary>
    </>
  );
}
