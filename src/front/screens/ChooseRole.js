import { Button, Layout, Text } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import config from '../config';

const Option = ({ children, role, selectedRole, setSelectedRole }) => {
  const onPress = () => {
    setSelectedRole(role);
  };
  const appearance = role === selectedRole ? 'filled' : 'outline';

  return (
    <Button appearance={appearance} style={styles.option} onPress={onPress} status="info" size="giant">
      {children}
    </Button>
  );
};
Option.propTypes = {
  children: propTypes.string,
  role: propTypes.string,
  selectedRole: propTypes.string,
  setSelectedRole: propTypes.func,
};

export default function ChooseRoleScreen({ navigation }) {
  const [selectedRole, setSelectedRole] = React.useState(null);
  const goToLogin = () => navigation.navigate('login', { role: selectedRole });

  return (
    <Layout style={styles.layout}>
      <Text category="h1">I am a...</Text>

      <View style={styles.optionsContainer}>
        <Option role={config.ROLES.public} selectedRole={selectedRole} setSelectedRole={setSelectedRole}>
          Member of the public that would like to report an animal carcass
        </Option>
        <Option role={config.ROLES.contractor} selectedRole={selectedRole} setSelectedRole={setSelectedRole}>
          State contractor
        </Option>
        <Option role={config.ROLES.agencyEmployee} selectedRole={selectedRole} setSelectedRole={setSelectedRole}>
          State agency employee
        </Option>
      </View>

      <Button onPress={goToLogin} size="large" disabled={selectedRole === null}>
        Next
      </Button>
    </Layout>
  );
}

ChooseRoleScreen.propTypes = {
  navigation: propTypes.object,
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  optionsContainer: {
    justifyContent: 'space-between',
    width: '100%',
  },
  option: {
    marginBottom: 10,
    width: '100%',
  },
});
