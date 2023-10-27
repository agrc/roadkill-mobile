import Location from './Location';

export default {
  title: 'Location',
  component: Location,
};

export const Default = () => (
  <Location
    onSetLocation={() => {}}
    onEditLocation={() => {}}
    showEdit={true}
    onCancel={() => {}}
  />
);

export const AfterSet = () => (
  <Location
    onSetLocation={() => {}}
    onEditLocation={() => {}}
    showEdit={false}
    onCancel={() => {}}
  />
);
