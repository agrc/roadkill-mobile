import { action } from '@storybook/addon-actions';
import { boolean } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';
import Location from '../../components/reports/Location';

storiesOf('Location', module)
  .add('default', () => (
    <Location
      onSetLocation={action('onSetLocation')}
      onEditLocation={action('onEditLocation')}
      showEdit={boolean('showEdit', true)}
    />
  ))
  .add('after set', () => (
    <Location
      onSetLocation={action('onSetLocation')}
      onEditLocation={action('onEditLocation')}
      showEdit={boolean('showEdit', false)}
    />
  ));
