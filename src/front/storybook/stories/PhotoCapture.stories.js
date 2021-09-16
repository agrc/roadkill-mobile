import { boolean } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';
import { Text } from '@ui-kitten/components';
import React from 'react';
import { View } from 'react-native';
import PhotoCapture from '../../components/reports/PhotoCapture';

const Default = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(null);

    return (
      <View style={{ padding: 20 }}>
        <PhotoCapture isRequired={boolean('isRequired', false)} value={value} onChange={setValue} />
        <Text>{JSON.stringify(value, null, '  ')}</Text>
      </View>
    );
  });
};
storiesOf('PhotoCapture', module).add('default', Default);
