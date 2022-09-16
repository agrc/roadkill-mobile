import { storiesOf } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { ReportInfo } from '../../screens/ReportInfo';

const publicData = {
  report_id: 37,
  animal_location: '-111.50000005960464 40.0000103662487',
  photo_id: null,
  photo_location: null,
  photo_date: null,
  submit_location: '-111.5 40',
  submit_date: '2021-10-28T00:17:25.426Z',
  species: 'Odocoileus hemionus',
  species_confidence_level: 'medium',
  sex: 'unknown',
  age_class: 'unknown',
  comments:
    'A whole bunch of comments, please give some more comments. A whole bunch of comments, please give some more comments. A whole bunch of comments, please give some more comments. A whole bunch of comments, please give some more comments. A whole bunch of comments, please give some more comments. A whole bunch of comments, please give some more comments.',
  pickup_date: null,
  route_id: null,
  repeat_submission: false,
  discovery_date: '2021-10-28T00:16:33.268Z',
};
const pickupData = {
  report_id: 36,
  animal_location: '-111.50000005960464 40.0000103662487',
  photo_id: 17,
  photo_location: null,
  photo_date: '2009-10-09T14:09:20.000Z',
  submit_location: '-111.5 40',
  submit_date: '2021-10-27T18:15:40.361Z',
  species: 'Odocoileus hemionus',
  species_confidence_level: 'medium',
  sex: 'unknown',
  age_class: 'unknown',
  comments: null,
  pickup_date: '2021-10-27T18:15:16.253Z',
  route_id: 1,
  repeat_submission: null,
  discovery_date: null,
};
const distinctLocations = {
  ...pickupData,
  submit_location: '-111.51 40.01',
  photo_location: '-111.49 40.02',
};
const noPhotoLocation = {
  ...pickupData,
  photo_location: null,
};
const offlineReport = {
  photo: {
    uri: 'file:///Users/scottdavis/Library/Developer/CoreSimulator/Devices/E32ACF35-CBCD-4C51-A6A1-B33A577AD38B/data/Containers/Data/Application/ADD045C8-E58C-4334-94F1-C2FB0A44B06B/Documents/offlineData/1648590870160/AAC6E9FA-6900-4F5C-8D23-5BBD37AC812C.jpg',
    type: 'image/jpeg',
    name: 'photo',
  },
  photo_location: '-19.5112 63.5314',
  photo_date: '2012-08-08T20:55:30.000Z',
  species_id: 1,
  common_name: 'Mule Deer',
  scientific_name: 'Odocoileus hemionus',
  species_type: 'wild',
  species_class: 'mammals',
  species_order: 'hoofed animals',
  family: 'deer',
  species_confidence_level: 'medium',
  age_class: 'juvenile',
  sex: 'male',
  pickup_date: '2022-03-24T22:05:09.902Z',
  animal_location: '-112 39.99986893970774',
  submit_date: '2022-03-24T22:05:44.428Z',
  submit_location: '-112 40',
  offlineStorageId: 1648159544460,
};

storiesOf('ReportInfo', module)
  .addDecorator((getStory) => <ScrollView>{getStory()}</ScrollView>)
  .add('public report', () => <ReportInfo data={publicData} />)
  .add('pickup report', () => <ReportInfo data={pickupData} />)
  .add('distinct locations', () => <ReportInfo data={distinctLocations} />)
  .add('no photo location', () => <ReportInfo data={noPhotoLocation} />)
  .add('offline submission with photo', () => <ReportInfo data={offlineReport} />);
