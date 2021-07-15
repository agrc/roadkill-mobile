import { useNavigation } from '@react-navigation/native';
import { Button, Input, Text } from '@ui-kitten/components';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import useAuth from '../auth/context';
import config from '../config';
import RootView from '../RootView';

export default function NewUserScreen() {
  const [organization, setOrganization] = React.useState(null);
  const [phone, setPhone] = React.useState(null);
  const { logOut, userType } = useAuth();
  const navigation = useNavigation();

  const register = () => {
    // TODO
  };
  const cancel = () => {
    navigation.navigate('login');
    logOut();
  };

  const { authInfo } = useAuth();
  return (
    <RootView>
      <ScrollView style={styles.layout}>
        <Text category="h1">Please complete your profile</Text>

        <View style={styles.inputsContainer}>
          <Input style={styles.input} label="Name" value={authInfo?.user.name} disabled />
          <Input style={styles.input} label="Email" value={authInfo?.user.email} disabled />
          {userType !== config.USER_TYPES.public ? (
            <Input
              style={styles.input}
              label="Organization"
              textContentType="organizationName"
              value={organization}
              onChangeText={setOrganization}
            />
          ) : null}
          <Input
            style={styles.input}
            label="Phone"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
        <Button onPress={register} style={styles.input}>
          Register
        </Button>
        <Button onPress={cancel} style={styles.input} status="warning" appearance="outline">
          Cancel
        </Button>
      </ScrollView>
    </RootView>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, padding: 25 },
  inputsContainer: { marginVertical: 25 },
  input: { marginVertical: 5 },
});
