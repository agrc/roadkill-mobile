import { FontAwesome, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Icon } from '@ui-kitten/components';
import propTypes from 'prop-types';
import React from 'react';
import { StyleSheet } from 'react-native';

function createIconsMap(Icons) {
  return new Proxy(
    {},
    {
      get: (target, name) => getIconProvider(Icons, name),
    }
  );
}

const ThirdPartyIcon = ({ Icons, name, style, fill }) => {
  const { height, tintColor, ...iconStyle } = StyleSheet.flatten(style);

  return <Icons name={name} size={height} color={fill || tintColor} style={iconStyle} />;
};
ThirdPartyIcon.propTypes = {
  Icons: propTypes.func.isRequired,
  name: propTypes.string.isRequired,
  style: propTypes.object,
  fill: propTypes.string,
};

const getIconProvider = (Icons, name) => {
  return {
    toReactElement: (props) => ThirdPartyIcon({ Icons, name, ...props }),
  };
};
const packs = [
  {
    name: 'material',
    icons: createIconsMap(MaterialIcons),
  },
  {
    name: 'material-community',
    icons: createIconsMap(MaterialCommunityIcons),
  },
  {
    name: 'font-awesome',
    icons: createIconsMap(FontAwesome),
  },
  {
    name: 'font-awesome-5',
    icons: createIconsMap(FontAwesome5),
  },
];

export default packs;

export function getIcon({ pack, name, size = null, color = null, style = null }) {
  const HydratedIcon = (props) => {
    const appliedStyle = [props.style, style];
    if (size) {
      appliedStyle.push({ width: size, height: size });
    }

    return <Icon {...props} pack={pack} name={name} style={appliedStyle} fill={color} />;
  };
  HydratedIcon.propTypes = {
    style: propTypes.object,
  };

  return HydratedIcon;
}
