import React from 'react';
import RepeatSubmission from './RepeatSubmission';

export default {
  title: 'RepeatSubmission',
  component: RepeatSubmission,
};

export const Default = () => {
  const [checked, setChecked] = React.useState(false);
  return (
    <RepeatSubmission
      checked={checked}
      onChange={setChecked}
      cancelReport={() => console.log('cancelReport')}
    />
  );
};
