import Spinner from './Spinner';

export default {
  title: 'Spinner',
  component: Spinner,
};

export const Default = () => <Spinner show={true} />;

export const WithMessage = () => <Spinner show={true} message={'Loading...'} />;
