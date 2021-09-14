import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react-native';
import React from 'react';
import RepeatSubmission from '../../components/reports/RepeatSubmission';

const Default = () => {
  return React.createElement(() => {
    const [checked, setChecked] = React.useState(false);
    return <RepeatSubmission checked={checked} onChange={setChecked} cancelReport={action('cancelReport')} />;
  });
};

storiesOf('RepeatSubmission', module).add('default', Default);
