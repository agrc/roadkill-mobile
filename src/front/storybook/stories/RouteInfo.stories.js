import { storiesOf } from '@storybook/react-native';
import React from 'react';
import { ScrollView } from 'react-native';
import { RouteInfo } from '../../screens/RouteInfo';

const data = {
  geog: 'LINESTRING(-111.83664740299157 40.68497478203966,-111.833962450252 40.685259146753374,-111.83360250623468 40.687057563909086,-111.79836687175637 40.68700608968323,-111.79780062239998 40.68313533254923,-111.8021303061858 40.67575632033561,-111.8149814273767 40.6770502705976,-111.81495921426092 40.68029957595697,-111.82029087594982 40.680738856072644,-111.82008419351716 40.68217707333608,-111.82951124074336 40.68190631043272,-111.83064135509944 40.68434550518023,-111.83638543261853 40.68501182968802)',
  extent:
    'POLYGON((-111.83664740299157 40.675756320335616,-111.83664740299157 40.68710372720348,-111.79777172219134 40.68710372720348,-111.79777172219134 40.675756320335616,-111.83664740299157 40.675756320335616))',
  end_time: '2022-02-11T17:30:22.649Z',
  route_id: 2,
  start_time: '2022-02-11T17:05:18.464Z',
  submit_date: '2022-02-11T17:30:22.655Z',
  distance: 8658.20530962883,
  pickups: [
    {
      common_name: 'Mule Deer',
      photo_id: 7,
      report_id: 9,
      submit_date: '2022-02-11T17:27:01.031Z',
      animal_location: '-111.81496012955904 40.67709357150807',
    },
    {
      common_name: 'Mule Deer',
      photo_id: 5,
      report_id: 7,
      submit_date: '2022-02-11T17:13:21.547Z',
      animal_location: '-111.83119051158428 40.68705519356367',
    },
  ],
};

storiesOf('RouteInfo', module)
  .addDecorator((getStory) => <ScrollView>{getStory()}</ScrollView>)
  .add('default', () => <RouteInfo data={data} />);