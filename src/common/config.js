const baseBundleId = 'gov.dts.ugrc.utahwvcr';

module.exports = {
  searchListImageSize: 50,
  reportPhotoThumbnailSize: 75,
  otherOrg: { id: -1, name: 'Other' },
  versionHeaderName: 'x-api-version',
  apiVersion: '1.0.2',
  authProviderNames: {
    apple: 'apple',
    facebook: 'facebook',
    google: 'google',
    utahid: 'utahid',
  },
  bundleIds: {
    development: `${baseBundleId}.dev`,
    staging: `${baseBundleId}.staging`,
    production: baseBundleId,
  },
};
