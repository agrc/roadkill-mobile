export function getCoordinatesFromExif(exif) {
  if (exif?.GPSLatitude && exif?.GPSLongitude) {
    let longitude = parseFloat(exif.GPSLongitude, 10);
    let latitude = parseFloat(exif.GPSLatitude, 10);
    longitude = longitude < 0 ? longitude : -longitude;

    return { latitude, longitude };
  }

  return null;
}

export function getDateFromExif(exif) {
  if (exif?.DateTimeOriginal) {
    const parts = exif.DateTimeOriginal.split(' ');
    const dateString = `${parts[0].replace(/:/g, '-')}T${parts[1]}Z`;

    const date = new Date(dateString);

    // exif date string is in the current timezone of the device
    // we need to adjust it to UTC
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

    return date.toISOString();
  }

  return null;
}
