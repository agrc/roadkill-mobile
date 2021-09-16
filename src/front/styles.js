import { useTheme } from '@ui-kitten/components';
import { StyleSheet } from 'react-native';

const PADDING = 10;
export default function useStyles() {
  const theme = useTheme();
  const roundedBorders = {
    borderRadius: 4,
  };
  const commonStyles = StyleSheet.create({
    margin: {
      marginVertical: PADDING,
    },
    roundedBorders,
    image: {
      ...roundedBorders,
      borderWidth: 1,
      borderColor: theme['color-basic-400'],
    },
  });

  return commonStyles;
}
