import { getCoordinatesFromExif, getDateFromExif } from './PhotoCapture';

describe('PhotoCapture', () => {
  describe('getCoordinatesFromExif', () => {
    it('returns the correct values', () => {
      const exif = {
        GPSLatitude: 40.5,
        GPSLongitude: -111.5,
      };
      const expected = { latitude: 40.5, longitude: -111.5 };
      expect(getCoordinatesFromExif(exif)).toEqual(expected);
    });
    it('parses string values', () => {
      const exif = {
        GPSLatitude: '40.5',
        GPSLongitude: '-111.5',
      };
      const expected = { latitude: 40.5, longitude: -111.5 };
      expect(getCoordinatesFromExif(exif)).toEqual(expected);
    });
    it('forces longitude to be negative', () => {
      const exif = {
        GPSLatitude: 40.5,
        GPSLongitude: 111.5,
      };
      const expected = { latitude: 40.5, longitude: -111.5 };
      expect(getCoordinatesFromExif(exif)).toEqual(expected);
    });
    it('returns null if no exif data', () => {
      expect(getCoordinatesFromExif({})).toBeNull();
    });
  });

  describe('getDateFromExif', () => {
    it('returns a valid date', () => {
      const exif = {
        DateTimeOriginal: '2018:12:01 12:00:00',
      };

      expect(getDateFromExif(exif)).toMatch(
        /2018-12-01T\d\d:\d\d:\d\d\.\d\d\dZ/,
      );
    });
    it('returns null if no date is present', () => {
      expect(getDateFromExif({})).toBeNull();
    });
  });
});
