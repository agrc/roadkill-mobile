import { useRoute } from '@react-navigation/native';
import { Layout } from '@ui-kitten/components';
import { Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ImageScreen() {
  const { uri } = useRoute().params;

  return (
    <Layout style={styles.container}>
      <SafeAreaView style={styles.container}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </SafeAreaView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
  },
});
