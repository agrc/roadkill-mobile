import { storiesOf } from '@storybook/react-native';
import React from 'react';
import CachedData from '../../components/CachedData';

const data = [
  {
    species_id: 34,
    common_name: 'Northern Raccoon',
    scientific_name: 'Procyon lotor',
    species_type: 'wild',
    species_class: 'mammals',
    species_order: 'carnivores',
    family: 'raccoons',
    repeat_submission: false,
    discovery_date: '2022-03-24T22:05:19.326Z',
    animal_location: '-112 39.99986893970774',
    submit_date: '2022-03-24T22:06:38.152Z',
    submit_location: '-112 40',
    offlineStorageId: 1648159598192,
  },
  {
    photo: {
      uri: 'file:///Users/username/Library/Developer/CoreSimulator/Devices/E32ACF35-CBCD-4C51-A6A1-B33A577AD38B/data/Containers/Data/Application/ADD045C8-E58C-4334-94F1-C2FB0A44B06B/Documents/offlineData/1648159544460/222F1C48-356B-4D3B-82B3-E8836CA73DCE.jpg',
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
  },
];

storiesOf('CachedData', module)
  .add('default', () => <CachedData data={data} />)
  .add('no data', () => <CachedData data={[]} />);
