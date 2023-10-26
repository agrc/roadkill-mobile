import { Text } from '@ui-kitten/components';
import React from 'react';
import { View } from 'react-native';
import PhotoCapture from './PhotoCapture';

export default {
  title: 'PhotoCapture',
  component: PhotoCapture,
};

export const Default = () => {
  return React.createElement(() => {
    const [value, setValue] = React.useState(null);

    return (
      <View style={{ padding: 20 }}>
        <PhotoCapture isRequired={false} value={value} onChange={setValue} />
        <Text>{JSON.stringify(value, null, '  ')}</Text>
      </View>
    );
  });
};
