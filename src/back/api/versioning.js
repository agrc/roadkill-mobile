import commonConfig from 'common/config.js';
import lt from 'semver/functions/lt.js';

export default function getVersionFromHeader(request, response, next) {
  let version = request.get(commonConfig.versionHeaderName) || '0.0.0';

  request.version = version;

  next();
}

export function switchByRequestVersion(minVersion, oldReturn, newReturn) {
  return (request, ...rest) => {
    if (lt(request.version, minVersion)) {
      return oldReturn(request, ...rest);
    }

    return newReturn(request, ...rest);
  };
}
