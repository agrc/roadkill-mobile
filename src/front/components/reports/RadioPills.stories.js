import React from 'react';
import RadioPills from './RadioPills';

export default {
  title: 'RadioPills',
  component: RadioPills,
};

export const Default = () => {
  const options = [
    {
      label: 'Option 1',
      value: 'option1',
    },
    {
      label: 'Option Hello 2',
      value: 'option2',
    },
    {
      label: 'Option 3',
      value: 'option3',
    },
    {
      label: 'Option Longer Label 4',
      value: 'option4',
    },
  ];
  return React.createElement(() => {
    const [value, setValue] = React.useState('');

    return <RadioPills value={value} onChange={setValue} options={options} label="test label" />;
  });
};

export const OptionsAsStrings = () => {
  const options = ['frequent', 'common', 'latin', 'order', 'class', 'group'];
  return React.createElement(() => {
    const [value, setValue] = React.useState('');

    return <RadioPills value={value} onChange={setValue} options={options} label="test label" />;
  });
};

export const UnknownOption = () => {
  const options = ['frequent', 'common', 'latin', 'order', 'class', 'group', 'unknown'];
  return React.createElement(() => {
    const [value, setValue] = React.useState('');

    return <RadioPills value={value} onChange={setValue} options={options} label="unknown option" />;
  });
};
