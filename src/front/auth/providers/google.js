import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import jwt_decode from 'jwt-decode';
import config from '../../config';
import { useAsyncError } from '../../utilities';

export default function useGoogleProvider() {
  const [_, __, promptAsync] = useIdTokenAuthRequest(
    {
      expoClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_EXPO_GO,
      androidClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
      iosClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
      selectAccount: true,
    },
    {
      path: config.OAUTH_REDIRECT_SCREEN,
    }
  );
  const throwAsyncError = useAsyncError();

  const logIn = async () => {
    try {
      const response = await promptAsync();

      if (response?.type === 'success') {
        const user = jwt_decode(response.params.id_token);

        // TODO: upsert user and get registered value
        const registered = false;

        return {
          user,
          providerName: config.PROVIDER_NAMES.google,
          registered,
        };
      } else {
        throwAsyncError(new Error(`${response.type} ${response.message}`));
      }
    } catch (error) {
      throwAsyncError(error);
    }
  };

  const logOut = () => {};

  return { logIn, logOut };
}
