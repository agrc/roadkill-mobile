import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import jwt_decode from 'jwt-decode';

export default function useGoogleProvider() {
  const [_, __, promptAsync] = useIdTokenAuthRequest(
    {
      expoClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_EXPO_GO,
      androidClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
      iosClientId: process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
      selectAccount: true,
    },
    {
      path: 'login',
    }
  );

  const logIn = async () => {
    try {
      const response = await promptAsync();

      if (response?.type === 'success') {
        return jwt_decode(response.params.id_token);
      } else {
        throw new Error(`${response.type} ${response.message}`);
      }
    } catch (error) {
      throw error;
    }
  };

  const logOut = () => {};

  return { logIn, logOut };
}
