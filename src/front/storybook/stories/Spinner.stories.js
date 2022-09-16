import { boolean } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';
import Spinner from '../../components/Spinner';

storiesOf('Spinner', module)
  .add('default', () => <Spinner show={boolean('show', true)} />)
  .add('with message', () => <Spinner show={boolean('show', true)} message={'Loading...'} />);
