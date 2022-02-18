import commonConfig from 'common/config.js';

export default function getVersionFromHeader(request, response, next) {
  const version = request.get(commonConfig.versionHeaderName);
  if (version) {
    request.version = version;
  }
  next();
}
