import CachedData from './CachedData';

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
  {
    start_time: '2022-03-29T23:52:58.687Z',
    end_time: '2022-03-29T23:53:56.065Z',
    geog: '-112.8495947 37.567797199999994, -112.8495947 37.567797199999994, -112.85042149999998 37.5683334, -112.85066255863794 37.568461034116616, -112.8507082 37.568485199999984, -112.8509345 37.56858400000001, -112.85145279999999 37.5687435, -112.852234 37.5689072, -112.8526957 37.56900019999999, -112.85327139999998 37.5691578, -112.8536855 37.56930479999999, -112.85412799999999 37.56947930000001, -112.85496549999999 37.569905299999995, -112.85496549999999 37.569905299999995, -112.85513835493872 37.56997534461224, -112.85515699999999 37.56998289999999, -112.8554071 37.57005099999999, -112.85574469999999 37.5700961, -112.8560428 37.57010650000001, -112.85670259999998 37.570093199999995',
    submit_date: '2022-03-29T23:53:56.065Z',
    offlineStorageId: 1648598036065,
    pickups: [
      {
        photo: {
          uri: 'file:///Users/scottdavis/Library/Developer/CoreSimulator/Devices/E32ACF35-CBCD-4C51-A6A1-B33A577AD38B/data/Containers/Data/Application/ADD045C8-E58C-4334-94F1-C2FB0A44B06B/Documents/offlineData/1648598036065/7B45D7D5-8FAC-4698-9AA9-740ACD381577.jpg',
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
        pickup_date: '2022-03-29T23:48:37.321Z',
        animal_location: '-112.85066255863795 37.56832997376996',
        submit_date: '2022-03-29T23:53:24.699Z',
        submit_location: '-112.852234 37.5689072',
      },
      {
        photo: {
          uri: 'file:///Users/scottdavis/Library/Developer/CoreSimulator/Devices/E32ACF35-CBCD-4C51-A6A1-B33A577AD38B/data/Containers/Data/Application/ADD045C8-E58C-4334-94F1-C2FB0A44B06B/Documents/offlineData/1648598036065/C6FA687A-6D0C-470F-B7E7-37478215FB95.jpg',
          type: 'image/jpeg',
          name: 'photo',
        },
        photo_location: '-17.548928333333333 65.682895',
        photo_date: '2012-08-08T17:52:11.000Z',
        species_id: 3,
        common_name: 'Elk',
        scientific_name: 'Cervus canadensis',
        species_type: 'wild',
        species_class: 'mammals',
        species_order: 'hoofed animals',
        family: 'deer',
        species_confidence_level: 'medium',
        age_class: 'unknown',
        sex: 'male',
        pickup_date: '2022-03-29T23:53:09.744Z',
        animal_location: '-112.85327139999998 37.56902673966877',
        submit_date: '2022-03-29T23:53:45.828Z',
        submit_location: '-112.85412799999999 37.56947930000001',
      },
    ],
  },
];

export default {
  title: 'CachedData',
  component: CachedData,
};

export const Default = () => <CachedData data={data} />;

export const NoData = () => <CachedData data={[]} />;