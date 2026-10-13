import { useQuery } from '@tanstack/react-query';
import { Text, useTheme } from '@ui-kitten/components';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker, type Camera, type Region } from 'react-native-maps';

type MileMarkerData = {
  OBJECTID: number;
  LEGEND_NUM: string;
  LONGITUDE: number;
  LATITUDE: number;
};

async function getData(
  db: SQLiteDatabase,
  region: Region,
): Promise<MileMarkerData[]> {
  const minLongitude = region.longitude - region.longitudeDelta / 2;
  const maxLongitude = region.longitude + region.longitudeDelta / 2;
  const minLatitude = region.latitude - region.latitudeDelta / 2;
  const maxLatitude = region.latitude + region.latitudeDelta / 2;

  const result = await db.getAllAsync<MileMarkerData>(
    `
      SELECT * FROM mile_markers
      WHERE longitude BETWEEN ? AND ?
      AND latitude BETWEEN ? AND ?
    `,
    [minLongitude, maxLongitude, minLatitude, maxLatitude],
  );

  return result;
}

type MapViewState = {
  camera: Camera | null;
  region: Region | null;
};

// SQLiteProvider is memoized without comparing its children, so it never
// re-renders MileMarkers with new props after the map moves. Context updates
// reach consumers through that memo boundary, so the map state goes here.
export const MapViewStateContext = createContext<MapViewState>({
  camera: null,
  region: null,
});

export default function MileMarkers() {
  const db = useSQLiteContext();
  const { camera, region } = useContext(MapViewStateContext);

  // zoom only shows up in android and altitude only shows up in ios
  // these are useful
  // console.log('camera.zoom', camera?.zoom);
  // console.log('camera.altitude', camera?.altitude);
  const letsDoThis =
    !!(camera?.zoom && camera?.zoom >= 13) ||
    (camera?.altitude && camera?.altitude < 20000);

  const {
    data: features,
    isSuccess,
    error,
  } = useQuery({
    queryKey: ['mile_markers', region],
    queryFn: () => {
      return letsDoThis && region ? getData(db, region) : Promise.resolve([]);
    },
    staleTime: 1000 * 60, // 60 seconds
  });

  const theme = useTheme();

  if (error) {
    console.error('Error fetching mile markers:', error);

    return null;
  }

  if (features && isSuccess) {
    return features.map((feature) => (
      <MileMarker key={feature.OBJECTID} feature={feature} />
    ));
  }

  return null;
}

// how long to let a new marker's label render before freezing its snapshot
const MARKER_RENDER_MS = 500;

function MileMarker({ feature }: { feature: MileMarkerData }) {
  // With tracksViewChanges={false}, react-native-maps rasterizes a custom
  // marker view once. On the new architecture that can happen before the
  // label is laid out, leaving a blank or text-less marker, so track view
  // changes briefly after mounting and then stop for performance.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(
      () => setTracksViewChanges(false),
      MARKER_RENDER_MS,
    );

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Marker
      coordinate={{
        latitude: feature.LATITUDE,
        longitude: feature.LONGITUDE,
      }}
      tracksViewChanges={tracksViewChanges}
    >
      <View
        style={{
          backgroundColor: 'black',
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 2,
        }}
      >
        <Text style={{ fontSize: 10, color: 'white' }}>
          {feature.LEGEND_NUM}
        </Text>
      </View>
    </Marker>
  );
}
