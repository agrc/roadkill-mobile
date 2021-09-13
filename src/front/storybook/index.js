import AsyncStorage from '@react-native-async-storage/async-storage';
import { withKnobs } from '@storybook/addon-knobs';
import { addDecorator, configure, getStorybookUI } from '@storybook/react-native';
import './rn-addons';

let StorybookUIRoot = null;
if (__DEV__) {
  // enables knobs for all stories
  addDecorator(withKnobs);

  // import stories
  configure(() => {
    require('./stories');
  }, module);

  // Refer to https://github.com/storybookjs/storybook/tree/master/app/react-native#start-command-parameters
  // To find allowed options for getStorybookUI
  StorybookUIRoot = getStorybookUI({
    asyncStorage: AsyncStorage,
  });
}

export default StorybookUIRoot;
