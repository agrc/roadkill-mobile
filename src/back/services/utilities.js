export function coordStringToWKT(coordString) {
  return `SRID=4326;POINT(${coordString})`;
}
