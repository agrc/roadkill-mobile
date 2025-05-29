import { useQuery } from '@tanstack/react-query';
import { Text, useTheme } from '@ui-kitten/components';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
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

type MileMarkersProps = {
  camera: Camera;
  region: Region;
};

export default function MileMarkers({ camera, region }: MileMarkersProps) {
  const db = useSQLiteContext();

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
      return letsDoThis ? getData(db, region) : Promise.resolve([]);
    },
    staleTime: 1000 * 60, // 60 seconds
  });

  const theme = useTheme();

  if (error) {
    console.error('Error fetching mile markers:', error);

    return null;
  }

  if (features && isSuccess) {
    return features.map((feature) => {
      return (
        <Marker
          key={feature.OBJECTID}
          coordinate={{
            latitude: feature.LATITUDE,
            longitude: feature.LONGITUDE,
          }}
          tracksViewChanges={false}
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
    });
  }

  return null;
}
