export function pointCoordStringToWKT(coordString) {
  if (!coordString) return null;

  return `SRID=4326;POINT(${coordString})`;
}

export function pointGeographyToCoordinates(columnName) {
  return `ST_X(${columnName}::geometry) || ' ' || ST_Y(${columnName}::geometry) as ${columnName}`;
}

export function lineCoordStringToWKT(coordsString) {
  if (!coordsString) return null;

  return `SRID=4326;LINESTRING(${coordsString})`;
}
