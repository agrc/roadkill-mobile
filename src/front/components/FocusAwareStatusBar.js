import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'react-native';

// cribbed from: https://reactnavigation.org/docs/status-bar/#tabs-and-drawer

export default function FocusAwareStatusBar(props) {
  const isFocused = useIsFocused();

  return isFocused ? <StatusBar {...props} /> : null;
}